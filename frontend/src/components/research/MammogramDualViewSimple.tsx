/**
 * MammogramDualViewSimple.tsx - RADIOLOGY EDITOR GRADE
 * 
 * Enhanced to meet journal reviewer requirements:
 * 1. Window/Level presets (Standard, High Contrast, Soft Tissue, Inverted)
 * 2. ROI/Measurement tool with distance display
 * 3. AI Overlay toggles (Box, Contour, Heatmap)
 * 4. Professional toolbar layout
 * 5. Interaction logging for all tools
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

interface Props {
  leftImage?: string;
  rightImage?: string;
  leftLabel?: string;
  rightLabel?: string;
  showAI?: boolean;
  showAIOverlay?: boolean;
  aiConfidence?: number;
  onInteraction?: (event: string, data?: Record<string, unknown>) => void;
  onZoom?: () => void;
  onPan?: () => void;
  onToolChange?: (tool: string) => void;
  onWLPresetChange?: (preset: string) => void;
  onOverlayToggle?: (overlay: string, enabled: boolean) => void;
}

type WindowLevel = { center: number; width: number };

// Window/Level presets for mammography
const WL_PRESETS = {
  'Standard': { center: 0.5, width: 1.0 },
  'High Contrast': { center: 0.45, width: 0.7 },
  'Soft Tissue': { center: 0.55, width: 1.2 },
  'Dense': { center: 0.4, width: 0.6 },
  'Inverted': { center: 0.5, width: -1.0 },
};

type WLPresetName = keyof typeof WL_PRESETS;

// Tool modes
type ToolMode = 'PAN' | 'MEASURE' | 'ROI';

// Overlay types
interface OverlayState {
  box: boolean;
  contour: boolean;
  heatmap: boolean;
}

const DEFAULT_IMAGES = {
  RCC: '/images/inbreast/20586908_6c613a14b80a8591_MG_R_CC_ANON.png',
  LCC: '/images/inbreast/20586934_6c613a14b80a8591_MG_L_CC_ANON.png',
  RMLO: '/images/inbreast/20586960_6c613a14b80a8591_MG_R_ML_ANON.png',
  LMLO: '/images/inbreast/20586986_6c613a14b80a8591_MG_L_ML_ANON.png',
};

export const MammogramDualViewSimple: React.FC<Props> = ({
  leftImage,
  rightImage,
  leftLabel = 'L CC',
  rightLabel = 'R CC',
  showAI = false,
  showAIOverlay = false,
  aiConfidence = 87,
  onInteraction,
  onZoom,
  onPan,
  onToolChange,
  onWLPresetChange,
  onOverlayToggle,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [windowLevel, setWindowLevel] = useState<WindowLevel>(WL_PRESETS.Standard);
  const [activePreset, setActivePreset] = useState<WLPresetName>('Standard');
  const [activeView, setActiveView] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isRightDrag, setIsRightDrag] = useState(false);
  const [viewsLinked, setViewsLinked] = useState(true);
  
  // New state for enhanced features
  const [activeTool, setActiveTool] = useState<ToolMode>('PAN');
  const [overlays, setOverlays] = useState<OverlayState>({ box: true, contour: false, heatmap: false });
  const [measureStart, setMeasureStart] = useState<{ x: number; y: number } | null>(null);
  const [measureEnd, setMeasureEnd] = useState<{ x: number; y: number } | null>(null);
  const [measurements, setMeasurements] = useState<Array<{ start: { x: number; y: number }; end: { x: number; y: number }; distance: number }>>([]);
  const [roiBox, setRoiBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const images = {
    left: leftImage || DEFAULT_IMAGES.LCC,
    right: rightImage || DEFAULT_IMAGES.RCC,
  };

  // Handle WL preset change
  const handlePresetChange = useCallback((preset: WLPresetName) => {
    setActivePreset(preset);
    setWindowLevel(WL_PRESETS[preset]);
    onWLPresetChange?.(preset);
    onInteraction?.('WL_PRESET_CHANGED', { preset, values: WL_PRESETS[preset] });
  }, [onWLPresetChange, onInteraction]);

  // Handle tool change
  const handleToolChange = useCallback((tool: ToolMode) => {
    setActiveTool(tool);
    onToolChange?.(tool);
    onInteraction?.('TOOL_CHANGED', { tool });
    // Clear pending measurements when switching tools
    if (tool !== 'MEASURE') {
      setMeasureStart(null);
      setMeasureEnd(null);
    }
  }, [onToolChange, onInteraction]);

  // Handle overlay toggle
  const handleOverlayToggle = useCallback((overlay: keyof OverlayState) => {
    setOverlays(prev => {
      const newState = { ...prev, [overlay]: !prev[overlay] };
      onOverlayToggle?.(overlay, newState[overlay]);
      onInteraction?.('OVERLAY_TOGGLED', { overlay, enabled: newState[overlay] });
      return newState;
    });
  }, [onOverlayToggle, onInteraction]);

  // Wheel handler for zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const newZoom = Math.max(0.5, Math.min(4, zoom * (e.deltaY > 0 ? 0.9 : 1.1)));
      setZoom(newZoom);
      onZoom?.();
      onInteraction?.('ZOOM_CHANGED', { zoom: newZoom, method: 'wheel' });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoom, onZoom, onInteraction]);

  const handleMouseDown = useCallback((e: React.MouseEvent, viewKey: string) => {
    e.preventDefault();
    setActiveView(viewKey);
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (activeTool === 'MEASURE') {
      if (!measureStart) {
        setMeasureStart({ x, y });
        onInteraction?.('MEASURE_STARTED', { x, y, view: viewKey });
      } else {
        const distance = Math.sqrt(Math.pow(x - measureStart.x, 2) + Math.pow(y - measureStart.y, 2));
        const distanceMm = Math.round(distance * 0.26); // Approximate mm conversion
        setMeasurements(prev => [...prev, { start: measureStart, end: { x, y }, distance: distanceMm }]);
        onInteraction?.('MEASURE_COMPLETED', { start: measureStart, end: { x, y }, distanceMm });
        setMeasureStart(null);
        setMeasureEnd(null);
      }
      return;
    }
    
    if (activeTool === 'ROI') {
      setRoiBox({ x, y, w: 0, h: 0 });
      onInteraction?.('ROI_STARTED', { x, y, view: viewKey });
    }
    
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setIsRightDrag(e.button === 2);
    onInteraction?.('VIEW_FOCUSED', { view: viewKey });
  }, [activeTool, measureStart, onInteraction]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Update measure preview
    if (activeTool === 'MEASURE' && measureStart) {
      const rect = e.currentTarget.getBoundingClientRect();
      setMeasureEnd({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
    
    // Update ROI preview
    if (activeTool === 'ROI' && roiBox && isDragging) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setRoiBox(prev => prev ? { ...prev, w: x - prev.x, h: y - prev.y } : null);
    }
    
    if (!isDragging || activeTool !== 'PAN') return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    if (isRightDrag) {
      setWindowLevel(prev => ({
        center: Math.max(0, Math.min(1, prev.center + deltaY * 0.002)),
        width: prev.width > 0 
          ? Math.max(0.1, Math.min(2, prev.width + deltaX * 0.002))
          : Math.min(-0.1, Math.max(-2, prev.width + deltaX * 0.002)),
      }));
      setActivePreset('Standard'); // Custom WL
    } else {
      setPan(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
      onPan?.();
    }
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragStart, isRightDrag, onPan, activeTool, measureStart, roiBox]);

  const handleMouseUp = useCallback(() => {
    if (activeTool === 'ROI' && roiBox && roiBox.w !== 0) {
      onInteraction?.('ROI_COMPLETED', { 
        x: roiBox.x, 
        y: roiBox.y, 
        width: Math.abs(roiBox.w), 
        height: Math.abs(roiBox.h) 
      });
    }
    setIsDragging(false);
  }, [activeTool, roiBox, onInteraction]);

  const handleReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setWindowLevel(WL_PRESETS['Standard']);
    setActivePreset('Standard');
    setMeasurements([]);
    setRoiBox(null);
    setMeasureStart(null);
    setMeasureEnd(null);
    onInteraction?.('VIEW_RESET', {});
  }, [onInteraction]);

  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(4, zoom * 1.2);
    setZoom(newZoom);
    onZoom?.();
  }, [zoom, onZoom]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(0.5, zoom * 0.8);
    setZoom(newZoom);
    onZoom?.();
  }, [zoom, onZoom]);

  // Compute display filters
  const brightness = windowLevel.center;
  const contrast = Math.abs(windowLevel.width);
  const invert = windowLevel.width < 0;
  const showOverlay = showAI || showAIOverlay;

  const renderView = (key: string, imageSrc: string, label: string) => {
    const hasFinding = showOverlay && key === 'right';
    
    return (
      <div
        key={key}
        onMouseDown={(e) => handleMouseDown(e, key)}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: 'relative',
          backgroundColor: '#000',
          borderRadius: 4,
          overflow: 'hidden',
          cursor: activeTool === 'MEASURE' ? 'crosshair' : activeTool === 'ROI' ? 'cell' : 'grab',
          aspectRatio: '3/4',
          border: activeView === key ? '2px solid #3b82f6' : '2px solid transparent',
        }}
      >
        {/* View label */}
        <div style={{
          position: 'absolute',
          top: 8,
          left: 8,
          backgroundColor: 'rgba(0,0,0,0.85)',
          color: '#fff',
          padding: '4px 10px',
          borderRadius: 4,
          fontSize: 12,
          fontFamily: 'monospace',
          fontWeight: 'bold',
          zIndex: 10,
        }}>
          {label}
        </div>
        
        {/* Image */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          filter: `brightness(${brightness}) contrast(${contrast}) ${invert ? 'invert(1)' : ''}`,
          transition: isDragging ? 'none' : 'transform 0.1s',
        }}>
          <img
            src={imageSrc}
            alt={label}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', pointerEvents: 'none' }}
            draggable={false}
          />
        </div>
        
        {/* AI Overlays */}
        {hasFinding && (
          <>
            {/* Bounding Box Overlay */}
            {overlays.box && (
              <div style={{
                position: 'absolute',
                top: '30%',
                right: '25%',
                width: 80,
                height: 80,
                border: '2px solid #a855f7',
                backgroundColor: 'transparent',
                borderRadius: 4,
                zIndex: 5,
                boxShadow: '0 0 15px rgba(168,85,247,0.5)',
              }}>
                <div style={{
                  position: 'absolute',
                  top: -24,
                  left: 0,
                  backgroundColor: 'rgba(0,0,0,0.9)',
                  color: '#a855f7',
                  padding: '4px 10px',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 'bold',
                }}>
                  AI: {aiConfidence}%
                </div>
              </div>
            )}
            
            {/* Contour Overlay */}
            {overlays.contour && (
              <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 6 }}>
                <ellipse
                  cx="75%"
                  cy="35%"
                  rx="45"
                  ry="55"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="2"
                  strokeDasharray="5,3"
                  opacity="0.8"
                />
              </svg>
            )}
            
            {/* Heatmap Overlay */}
            {overlays.heatmap && (
              <div style={{
                position: 'absolute',
                top: '25%',
                right: '20%',
                width: 100,
                height: 100,
                background: 'radial-gradient(ellipse at center, rgba(239,68,68,0.6) 0%, rgba(239,68,68,0.3) 40%, rgba(251,191,36,0.2) 70%, transparent 100%)',
                borderRadius: '50%',
                zIndex: 4,
                filter: 'blur(8px)',
              }} />
            )}
          </>
        )}
        
        {/* Measurement lines */}
        <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15 }}>
          {measurements.map((m, i) => (
            <g key={i}>
              <line
                x1={m.start.x}
                y1={m.start.y}
                x2={m.end.x}
                y2={m.end.y}
                stroke="#fbbf24"
                strokeWidth="2"
              />
              <circle cx={m.start.x} cy={m.start.y} r="4" fill="#fbbf24" />
              <circle cx={m.end.x} cy={m.end.y} r="4" fill="#fbbf24" />
              <text
                x={(m.start.x + m.end.x) / 2}
                y={(m.start.y + m.end.y) / 2 - 8}
                fill="#fbbf24"
                fontSize="12"
                fontWeight="bold"
                textAnchor="middle"
              >
                {m.distance}mm
              </text>
            </g>
          ))}
          {/* Active measurement preview */}
          {measureStart && measureEnd && (
            <g>
              <line
                x1={measureStart.x}
                y1={measureStart.y}
                x2={measureEnd.x}
                y2={measureEnd.y}
                stroke="#fbbf24"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
              <circle cx={measureStart.x} cy={measureStart.y} r="4" fill="#fbbf24" />
            </g>
          )}
        </svg>
        
        {/* ROI box */}
        {roiBox && roiBox.w !== 0 && (
          <div style={{
            position: 'absolute',
            left: roiBox.w > 0 ? roiBox.x : roiBox.x + roiBox.w,
            top: roiBox.h > 0 ? roiBox.y : roiBox.y + roiBox.h,
            width: Math.abs(roiBox.w),
            height: Math.abs(roiBox.h),
            border: '2px dashed #22d3ee',
            backgroundColor: 'rgba(34, 211, 238, 0.1)',
            zIndex: 15,
          }} />
        )}
        
        {/* Zoom indicator */}
        {zoom !== 1 && (
          <div style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: '#9ca3af',
            padding: '3px 8px',
            borderRadius: 4,
            fontSize: 11,
            fontFamily: 'monospace',
          }}>
            {Math.round(zoom * 100)}%
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      style={{ backgroundColor: '#111827', borderRadius: 8, overflow: 'hidden', border: '1px solid #374151' }}
    >
      {/* Main Toolbar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        backgroundColor: '#1f2937',
        borderBottom: '1px solid #374151',
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        {/* Left: Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: '#6b7280', fontSize: 10, marginRight: 4, fontWeight: 600 }}>TOOLS:</span>
          {(['PAN', 'MEASURE', 'ROI'] as ToolMode[]).map(tool => (
            <button
              key={tool}
              onClick={() => handleToolChange(tool)}
              style={{
                padding: '5px 10px',
                backgroundColor: activeTool === tool ? '#3b82f6' : '#374151',
                border: 'none',
                borderRadius: 4,
                color: activeTool === tool ? 'white' : '#d1d5db',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: activeTool === tool ? 600 : 400,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {tool === 'PAN' && ''}
              {tool === 'MEASURE' && ''}
              {tool === 'ROI' && 'ROI'}
              {tool}
            </button>
          ))}
        </div>
        
        {/* Center: WL Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: '#6b7280', fontSize: 10, marginRight: 4, fontWeight: 600 }}>W/L:</span>
          {(Object.keys(WL_PRESETS) as WLPresetName[]).map(preset => (
            <button
              key={preset}
              onClick={() => handlePresetChange(preset)}
              style={{
                padding: '5px 8px',
                backgroundColor: activePreset === preset ? '#7c3aed' : '#374151',
                border: 'none',
                borderRadius: 4,
                color: activePreset === preset ? 'white' : '#d1d5db',
                cursor: 'pointer',
                fontSize: 10,
                fontWeight: activePreset === preset ? 600 : 400,
              }}
            >
              {preset === 'Inverted' ? '◐' : ''} {preset}
            </button>
          ))}
        </div>
        
        {/* Right: Zoom + Reset + Link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button onClick={handleZoomOut} style={{ padding: '5px 10px', backgroundColor: '#374151', border: 'none', borderRadius: 4, color: '#d1d5db', cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}>−</button>
          <span style={{ color: '#9ca3af', fontSize: 11, width: 45, textAlign: 'center', fontFamily: 'monospace' }}>{Math.round(zoom * 100)}%</span>
          <button onClick={handleZoomIn} style={{ padding: '5px 10px', backgroundColor: '#374151', border: 'none', borderRadius: 4, color: '#d1d5db', cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}>+</button>
          <div style={{ width: 1, height: 20, backgroundColor: '#4b5563', margin: '0 4px' }} />
          <button onClick={handleReset} style={{ padding: '5px 10px', backgroundColor: '#374151', border: 'none', borderRadius: 4, color: '#d1d5db', cursor: 'pointer', fontSize: 11 }}>↺ Reset</button>
          <button onClick={() => setViewsLinked(v => !v)} style={{ padding: '5px 10px', backgroundColor: viewsLinked ? '#2563eb' : '#374151', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer', fontSize: 11 }}>
            {viewsLinked ? '' : ''}
          </button>
        </div>
      </div>
      
      {/* AI Overlay Toolbar (only when AI active) */}
      {showOverlay && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 12px',
          backgroundColor: '#1e1b4b',
          borderBottom: '1px solid #4338ca',
          gap: '12px',
        }}>
          <span style={{ color: '#a5b4fc', fontSize: 10, fontWeight: 600 }}> AI OVERLAYS:</span>
          {(['box', 'contour', 'heatmap'] as (keyof OverlayState)[]).map(overlay => (
            <button
              key={overlay}
              onClick={() => handleOverlayToggle(overlay)}
              style={{
                padding: '4px 10px',
                backgroundColor: overlays[overlay] ? '#7c3aed' : '#374151',
                border: overlays[overlay] ? '1px solid #a855f7' : '1px solid #4b5563',
                borderRadius: 4,
                color: overlays[overlay] ? 'white' : '#9ca3af',
                cursor: 'pointer',
                fontSize: 10,
                fontWeight: overlays[overlay] ? 600 : 400,
                textTransform: 'capitalize',
              }}
            >
              {overlay === 'box' && 'Box'}
              {overlay === 'contour' && '◯'}
              {overlay === 'heatmap' && ''}
              {' '}{overlay}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', color: '#818cf8', fontSize: 10 }}>
            Confidence: <strong>{aiConfidence}%</strong>
          </div>
        </div>
      )}
      
      {/* Viewer Area */}
      <div style={{ padding: 8, backgroundColor: '#0f172a' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {renderView('left', images.left, leftLabel)}
          {renderView('right', images.right, rightLabel)}
        </div>
      </div>
      
      {/* Status Bar */}
      <div style={{
        padding: '8px 12px',
        backgroundColor: '#1f2937',
        borderTop: '1px solid #374151',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 10,
        color: '#9ca3af',
      }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <span><strong>Pan:</strong> Left-drag</span>
          <span><strong>W/L:</strong> Right-drag</span>
          <span><strong>Zoom:</strong> Scroll</span>
          {activeTool === 'MEASURE' && <span style={{ color: '#fbbf24' }}><strong> Measure:</strong> Click two points</span>}
          {activeTool === 'ROI' && <span style={{ color: '#22d3ee' }}><strong>ROI:</strong> Click and drag</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {measurements.length > 0 && (
            <span style={{ color: '#fbbf24' }}> {measurements.length} measurement{measurements.length > 1 ? 's' : ''}</span>
          )}
          <span style={{ color: '#f59e0b' }}> Research simulation</span>
        </div>
      </div>
    </div>
  );
};

export default MammogramDualViewSimple;
