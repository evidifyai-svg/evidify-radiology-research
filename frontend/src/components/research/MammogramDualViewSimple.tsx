/**
 * MammogramDualViewSimple.tsx - RADIOLOGY RESEARCH VIEWER
 *
 * Enhanced to meet journal reviewer requirements:
 * 1. Window/Level presets (Standard, High Contrast, Soft Tissue, Inverted)
 * 2. ROI/Measurement tool with distance display (px - uncalibrated demo)
 * 3. AI Overlay toggles (Box, Contour, Heatmap)
 * 4. Professional toolbar layout
 * 5. Core interaction logging (VIEW_FOCUSED, ZOOM_CHANGED, PAN_CHANGED,
 *    WINDOW_LEVEL_CHANGED, AI_OVERLAY_TOGGLED);
 *    measurement/ROI state stored locally
 *
 * NOTE: W/L uses CSS filter approximation (non-diagnostic demo).
 * NOTE: Measurements display in px (no DICOM pixel spacing metadata).
 * NOTE: Views share state (linked) - per-view state not yet implemented.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { ViewerInteractionEvent } from '../../types/imaging';

// Valid view keys for type-safe interaction logging
type ValidViewKey = 'LCC' | 'LMLO' | 'RCC' | 'RMLO';

// Throttle interval for drag event emissions (ms)
const DRAG_EMIT_THROTTLE_MS = 100;

interface Props {
  leftImage?: string;
  rightImage?: string;
  leftLabel?: string;
  rightLabel?: string;
  showAI?: boolean;
  showAIOverlay?: boolean;
  aiConfidence?: number;
  /** Callback for viewer interaction events - receives full ViewerInteractionEvent objects */
  onInteraction?: (event: ViewerInteractionEvent) => void;
  onZoom?: () => void;
  onPan?: () => void;
  onToolChange?: (tool: string) => void;
  onWLPresetChange?: (preset: string) => void;
  onOverlayToggle?: (overlay: string, enabled: boolean) => void;
}

type WindowLevel = { center: number; width: number };

/**
 * Window/Level presets for mammography (CSS filter approximation).
 * CSS brightness(1.0) = normal; we map center via: brightness = 0.5 + center
 * So center=0.5 → brightness=1.0 (normal), center=0.3 → brightness=0.8 (darker)
 */
const WL_PRESETS = {
  'Standard': { center: 0.5, width: 1.0 },
  'High Contrast': { center: 0.5, width: 0.6 },
  'Soft Tissue': { center: 0.6, width: 1.3 },
  'Dense': { center: 0.4, width: 0.5 },
  'Inverted': { center: 0.5, width: -1.0 },
};

type WLPresetName = keyof typeof WL_PRESETS | 'Custom';

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
  const lastEmitTimeRef = useRef<number>(0); // For throttling drag events
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [windowLevel, setWindowLevel] = useState<WindowLevel>(WL_PRESETS.Standard);
  const [activePreset, setActivePreset] = useState<WLPresetName>('Standard');
  const [activeView, setActiveView] = useState<ValidViewKey | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isRightDrag, setIsRightDrag] = useState(false);
  // Note: viewsLinked toggle removed - views share state until per-view state is implemented

  // New state for enhanced features
  const [activeTool, setActiveTool] = useState<ToolMode>('PAN');
  const [overlays, setOverlays] = useState<OverlayState>({ box: true, contour: false, heatmap: false });
  const [measureStart, setMeasureStart] = useState<{ x: number; y: number } | null>(null);
  const [measureEnd, setMeasureEnd] = useState<{ x: number; y: number } | null>(null);
  const [measurements, setMeasurements] = useState<Array<{ start: { x: number; y: number }; end: { x: number; y: number }; distance: number }>>([]);
  const [roiBox, setRoiBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // View configuration: use actual view keys for type-safe logging
  const leftViewKey: ValidViewKey = 'LCC';
  const rightViewKey: ValidViewKey = 'RCC';

  const images = {
    [leftViewKey]: leftImage || DEFAULT_IMAGES.LCC,
    [rightViewKey]: rightImage || DEFAULT_IMAGES.RCC,
  };

  // Emit helper: constructs full ViewerInteractionEvent objects
  const emit = useCallback((
    eventType: ViewerInteractionEvent['eventType'],
    details: Record<string, unknown>,
    viewKey?: ValidViewKey
  ) => {
    onInteraction?.({
      timestamp: new Date().toISOString(),
      eventType,
      viewKey,
      details,
    });
  }, [onInteraction]);

  // Convert screen coords to image coords so annotations track with zoom/pan
  // Transform is: screen = image * zoom + pan, so inverse is: image = (screen - pan) / zoom
  const screenToImage = useCallback((pt: { x: number; y: number }) => ({
    x: (pt.x - pan.x) / zoom,
    y: (pt.y - pan.y) / zoom,
  }), [pan.x, pan.y, zoom]);

  // Handle WL preset change (only for named presets, not 'Custom')
  const handlePresetChange = useCallback((preset: keyof typeof WL_PRESETS) => {
    setActivePreset(preset);
    const values = WL_PRESETS[preset];
    setWindowLevel(values);
    onWLPresetChange?.(preset);
    emit('WINDOW_LEVEL_CHANGED', { preset, windowCenter: values.center, windowWidth: values.width });
  }, [onWLPresetChange, emit]);

  // Handle tool change
  const handleToolChange = useCallback((tool: ToolMode) => {
    setActiveTool(tool);
    onToolChange?.(tool);
    // Note: TOOL_CHANGED is not a valid ViewerInteractionEvent type - use callback only
    // Clear pending measurements when switching tools
    if (tool !== 'MEASURE') {
      setMeasureStart(null);
      setMeasureEnd(null);
    }
  }, [onToolChange]);

  // Handle overlay toggle
  const handleOverlayToggle = useCallback((overlay: keyof OverlayState) => {
    setOverlays(prev => {
      const newState = { ...prev, [overlay]: !prev[overlay] };
      onOverlayToggle?.(overlay, newState[overlay]);
      emit('AI_OVERLAY_TOGGLED', { overlay, enabled: newState[overlay] });
      return newState;
    });
  }, [onOverlayToggle, emit]);

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
      emit('ZOOM_CHANGED', { zoom: newZoom, method: 'wheel' });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoom, onZoom, emit]);

  const handleMouseDown = useCallback((e: React.MouseEvent, viewKey: ValidViewKey) => {
    e.preventDefault();
    setActiveView(viewKey);

    const rect = e.currentTarget.getBoundingClientRect();
    const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    // Convert to image coords so annotations track with zoom/pan
    const imgPt = screenToImage(screenPt);

    if (activeTool === 'MEASURE') {
      if (!measureStart) {
        setMeasureStart(imgPt);
        // Note: MEASURE_STARTED is not a valid ViewerInteractionEvent type - handled locally
      } else {
        // Distance in image pixels (uncalibrated - no DICOM pixel spacing metadata)
        const dx = imgPt.x - measureStart.x;
        const dy = imgPt.y - measureStart.y;
        const distancePx = Math.round(Math.sqrt(dx * dx + dy * dy));
        setMeasurements(prev => [...prev, { start: measureStart, end: imgPt, distance: distancePx }]);
        // Note: MEASURE_COMPLETED is not a valid ViewerInteractionEvent type - handled locally
        setMeasureStart(null);
        setMeasureEnd(null);
      }
      return;
    }

    if (activeTool === 'ROI') {
      setRoiBox({ x: imgPt.x, y: imgPt.y, w: 0, h: 0 });
      // Note: ROI_STARTED is not a valid ViewerInteractionEvent type - handled locally
    }

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setIsRightDrag(e.button === 2);
    emit('VIEW_FOCUSED', { view: viewKey }, viewKey);
  }, [activeTool, measureStart, emit, screenToImage]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    // Update measure preview (in image coords)
    if (activeTool === 'MEASURE' && measureStart) {
      const imgPt = screenToImage(screenPt);
      setMeasureEnd(imgPt);
    }

    // Update ROI preview (in image coords)
    if (activeTool === 'ROI' && roiBox && isDragging) {
      const imgPt = screenToImage(screenPt);
      setRoiBox(prev => prev ? { ...prev, w: imgPt.x - prev.x, h: imgPt.y - prev.y } : null);
    }

    if (!isDragging || activeTool !== 'PAN') return;

    // Compute delta from drag start
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    // Get current active view for emission (already typed as ValidViewKey | null)
    const currentViewKey = activeView ?? undefined;

    // Throttle event emissions and callbacks to avoid log spam during drag
    const now = Date.now();
    const shouldEmit = now - lastEmitTimeRef.current >= DRAG_EMIT_THROTTLE_MS;

    if (isRightDrag) {
      // Right-drag: adjust window/level
      setWindowLevel(prev => {
        const newWL = {
          center: Math.max(0, Math.min(1, prev.center + dy * 0.002)),
          width: prev.width > 0
            ? Math.max(0.1, Math.min(2, prev.width + dx * 0.002))
            : Math.min(-0.1, Math.max(-2, prev.width + dx * 0.002)),
        };
        // Emit WINDOW_LEVEL_CHANGED (throttled)
        if (shouldEmit) {
          emit('WINDOW_LEVEL_CHANGED', {
            windowCenter: newWL.center,
            windowWidth: newWL.width,
            method: 'drag',
          }, currentViewKey);
          lastEmitTimeRef.current = now;
        }
        return newWL;
      });
      setActivePreset('Custom'); // Mark as custom W/L via drag
    } else {
      // Left-drag: pan the view
      setPan(prev => {
        const newPan = { x: prev.x + dx, y: prev.y + dy };
        // Emit PAN_CHANGED (throttled)
        if (shouldEmit) {
          emit('PAN_CHANGED', { panX: newPan.x, panY: newPan.y, zoom, method: 'drag' }, currentViewKey);
          onPan?.(); // Also throttle the callback
          lastEmitTimeRef.current = now;
        }
        return newPan;
      });
    }
    // Update dragStart for next delta calculation
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragStart, isRightDrag, onPan, emit, zoom, activeTool, measureStart, roiBox, activeView, screenToImage]);

  const handleMouseUp = useCallback(() => {
    // Note: ROI_COMPLETED is not a valid ViewerInteractionEvent type - ROI state is handled locally
    setIsDragging(false);
    lastEmitTimeRef.current = 0; // Reset throttle timer
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setWindowLevel(WL_PRESETS['Standard']);
    setActivePreset('Standard');
    setMeasurements([]);
    setRoiBox(null);
    setMeasureStart(null);
    setMeasureEnd(null);
    lastEmitTimeRef.current = 0; // Reset throttle timer
    // Note: VIEW_RESET is not a valid ViewerInteractionEvent type - reset handled locally
  }, []);

  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(4, zoom * 1.2);
    setZoom(newZoom);
    onZoom?.();
    emit('ZOOM_CHANGED', { zoom: newZoom, method: 'button' });
  }, [zoom, onZoom, emit]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(0.5, zoom * 0.8);
    setZoom(newZoom);
    onZoom?.();
    emit('ZOOM_CHANGED', { zoom: newZoom, method: 'button' });
  }, [zoom, onZoom, emit]);

  // Compute display filters (CSS filter approximation - non-diagnostic demo)
  // brightness(1.0) is normal in CSS, so map center: brightness = 0.5 + center
  // contrast: use 0.5 + abs(width) so width=1.0 → contrast=1.5
  const brightness = 0.5 + windowLevel.center;
  const contrast = 0.5 + Math.abs(windowLevel.width);
  const invert = windowLevel.width < 0;
  const showOverlay = showAI || showAIOverlay;

  const renderView = (viewKey: ValidViewKey, imageSrc: string, label: string) => {
    const hasFinding = showOverlay && viewKey === rightViewKey;

    return (
      <div
        key={viewKey}
        onMouseDown={(e) => handleMouseDown(e, viewKey)}
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
          border: activeView === viewKey ? '2px solid #3b82f6' : '2px solid transparent',
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
        
        {/* Image + Annotations (same transform so annotations track with image) */}
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
          {/* Measurement lines (in image coords, rendered inside transform) */}
          <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
            {measurements.map((m, i) => (
              <g key={i}>
                <line
                  x1={m.start.x}
                  y1={m.start.y}
                  x2={m.end.x}
                  y2={m.end.y}
                  stroke="#fbbf24"
                  strokeWidth={2 / zoom}
                />
                <circle cx={m.start.x} cy={m.start.y} r={4 / zoom} fill="#fbbf24" />
                <circle cx={m.end.x} cy={m.end.y} r={4 / zoom} fill="#fbbf24" />
                <text
                  x={(m.start.x + m.end.x) / 2}
                  y={(m.start.y + m.end.y) / 2 - 8 / zoom}
                  fill="#fbbf24"
                  fontSize={12 / zoom}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {m.distance}px
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
                  strokeWidth={2 / zoom}
                  strokeDasharray={`${5 / zoom},${5 / zoom}`}
                />
                <circle cx={measureStart.x} cy={measureStart.y} r={4 / zoom} fill="#fbbf24" />
              </g>
            )}
          </svg>
          {/* ROI box (in image coords, rendered inside transform) */}
          {roiBox && roiBox.w !== 0 && (
            <div style={{
              position: 'absolute',
              left: roiBox.w > 0 ? roiBox.x : roiBox.x + roiBox.w,
              top: roiBox.h > 0 ? roiBox.y : roiBox.y + roiBox.h,
              width: Math.abs(roiBox.w),
              height: Math.abs(roiBox.h),
              border: `${2 / zoom}px dashed #22d3ee`,
              backgroundColor: 'rgba(34, 211, 238, 0.1)',
              pointerEvents: 'none',
            }} />
          )}
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
              {tool === 'PAN' ? 'Pan' : tool === 'MEASURE' ? 'Measure' : 'ROI'}
            </button>
          ))}
        </div>
        
        {/* Center: WL Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: '#6b7280', fontSize: 10, marginRight: 4, fontWeight: 600 }}>W/L:</span>
          {(Object.keys(WL_PRESETS) as (keyof typeof WL_PRESETS)[]).map(preset => (
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
          {/* Show 'Custom' indicator when W/L modified via drag */}
          {activePreset === 'Custom' && (
            <span style={{
              padding: '5px 8px',
              backgroundColor: '#6366f1',
              borderRadius: 4,
              color: 'white',
              fontSize: 10,
              fontWeight: 600,
              fontStyle: 'italic',
            }}>
              Custom
            </span>
          )}
        </div>
        
        {/* Right: Zoom + Reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button onClick={handleZoomOut} style={{ padding: '5px 10px', backgroundColor: '#374151', border: 'none', borderRadius: 4, color: '#d1d5db', cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}>−</button>
          <span style={{ color: '#9ca3af', fontSize: 11, width: 45, textAlign: 'center', fontFamily: 'monospace' }}>{Math.round(zoom * 100)}%</span>
          <button onClick={handleZoomIn} style={{ padding: '5px 10px', backgroundColor: '#374151', border: 'none', borderRadius: 4, color: '#d1d5db', cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}>+</button>
          <div style={{ width: 1, height: 20, backgroundColor: '#4b5563', margin: '0 4px' }} />
          <button onClick={handleReset} style={{ padding: '5px 10px', backgroundColor: '#374151', border: 'none', borderRadius: 4, color: '#d1d5db', cursor: 'pointer', fontSize: 11 }}>↺ Reset</button>
          {/* Note: viewsLinked toggle removed - views share state until per-view state is implemented */}
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
          <span style={{ color: '#a5b4fc', fontSize: 10, fontWeight: 600 }}>AI OVERLAYS:</span>
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
              {overlay === 'box' ? 'Box' : overlay === 'contour' ? 'Contour' : 'Heatmap'}
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
          {renderView(leftViewKey, images[leftViewKey], leftLabel)}
          {renderView(rightViewKey, images[rightViewKey], rightLabel)}
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
          {activeTool === 'MEASURE' && <span style={{ color: '#fbbf24' }}><strong>Measure:</strong> Click two points</span>}
          {activeTool === 'ROI' && <span style={{ color: '#22d3ee' }}><strong>⬜ ROI:</strong> Click and drag</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {measurements.length > 0 && (
            <span style={{ color: '#fbbf24' }}>{measurements.length} measurement{measurements.length > 1 ? 's' : ''}</span>
          )}
          <span style={{ color: '#f59e0b' }}>Research simulation</span>
        </div>
      </div>
    </div>
  );
};

export default MammogramDualViewSimple;
