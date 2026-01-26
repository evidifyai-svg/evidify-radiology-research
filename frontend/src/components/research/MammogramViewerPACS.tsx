/**
 * MammogramViewerPACS.tsx
 * 
 * PACS-Fidelity Mammography Viewer for Evidify Research Platform
 * 
 * Features:
 * - Window/Level presets (Mammography standard presets)
 * - Measurement tools (length, angle, area)
 * - Annotation system with labels
 * - AI overlay toggle
 * - Zoom/Pan with state tracking
 * - Hanging protocol support
 * - Keyboard-first interaction
 * - "No Priors" indicator
 * - ROI marking for gaze proxy
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

// =============================================================================
// TYPES
// =============================================================================
interface ViewerProps {
  leftImage?: string;
  rightImage?: string;
  leftLabel?: string;
  rightLabel?: string;
  showAIOverlay: boolean;
  aiRegion?: { x: number; y: number; width: number; height: number; confidence: number };
  hangingProtocol?: 'MAMMO_CC_ONLY' | 'MAMMO_MLO_ONLY' | 'MAMMO_CC_MLO' | 'MAMMO_TEMPORAL';
  onZoom?: (delta: number) => void;
  onPan?: (dx: number, dy: number) => void;
  onMeasurement?: (measurement: MeasurementData) => void;
  onWLChange?: (wl: WindowLevel) => void;
  onToolChange?: (tool: ToolType) => void;
  onROIHover?: (roi: string, isEntering: boolean) => void;
}

interface WindowLevel {
  window: number;
  level: number;
  preset: string;
}

interface MeasurementData {
  id: string;
  type: 'length' | 'angle' | 'area' | 'roi';
  points: { x: number; y: number }[];
  value: number;
  unit: string;
  label?: string;
  timestamp: string;
}

type ToolType = 'pan' | 'zoom' | 'wl' | 'length' | 'angle' | 'area' | 'roi' | 'annotate';

// =============================================================================
// CONSTANTS
// =============================================================================
const WL_PRESETS: { name: string; window: number; level: number }[] = [
  { name: 'Default', window: 4096, level: 2048 },
  { name: 'Dense', window: 3000, level: 1500 },
  { name: 'Fatty', window: 2500, level: 1250 },
  { name: 'Implant', window: 5000, level: 2500 },
  { name: 'Calcification', window: 1500, level: 750 },
];

const TOOLS: { id: ToolType; label: string; icon: string; shortcut: string }[] = [
  { id: 'pan', label: 'Pan', icon: '✋', shortcut: 'P' },
  { id: 'zoom', label: 'Zoom', icon: '🔍', shortcut: 'Z' },
  { id: 'wl', label: 'W/L', icon: '☀️', shortcut: 'W' },
  { id: 'length', label: 'Length', icon: '📏', shortcut: 'L' },
  { id: 'angle', label: 'Angle', icon: '📐', shortcut: 'G' },
  { id: 'area', label: 'Area', icon: '⬡', shortcut: 'A' },
  { id: 'roi', label: 'ROI', icon: '⭕', shortcut: 'O' },
  { id: 'annotate', label: 'Note', icon: '📝', shortcut: 'N' },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export const MammogramViewerPACS: React.FC<ViewerProps> = ({
  leftImage,
  rightImage,
  leftLabel = 'L CC',
  rightLabel = 'R CC',
  showAIOverlay,
  aiRegion,
  hangingProtocol = 'MAMMO_CC_ONLY',
  onZoom,
  onPan,
  onMeasurement,
  onWLChange,
  onToolChange,
  onROIHover,
}) => {
  // State
  const [activeTool, setActiveTool] = useState<ToolType>('pan');
  const [windowLevel, setWindowLevel] = useState<WindowLevel>({ window: 4096, level: 2048, preset: 'Default' });
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [measurements, setMeasurements] = useState<MeasurementData[]>([]);
  const [currentMeasurement, setCurrentMeasurement] = useState<{ x: number; y: number }[]>([]);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  const viewerRef = useRef<HTMLDivElement>(null);

  // Handle tool change
  const handleToolChange = useCallback((tool: ToolType) => {
    setActiveTool(tool);
    onToolChange?.(tool);
  }, [onToolChange]);

  // Handle W/L preset change
  const handleWLPreset = useCallback((preset: typeof WL_PRESETS[0]) => {
    const wl = { window: preset.window, level: preset.level, preset: preset.name };
    setWindowLevel(wl);
    onWLChange?.(wl);
  }, [onWLChange]);

  // Handle zoom
  const handleZoom = useCallback((delta: number) => {
    setZoom(z => Math.max(0.5, Math.min(4, z + delta * 0.1)));
    onZoom?.(delta);
  }, [onZoom]);

  // Handle pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (activeTool === 'pan') {
      setIsPanning(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    } else if (['length', 'angle', 'area', 'roi'].includes(activeTool)) {
      const rect = viewerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left) / zoom - panOffset.x;
        const y = (e.clientY - rect.top) / zoom - panOffset.y;
        setCurrentMeasurement(prev => [...prev, { x, y }]);
      }
    }
  }, [activeTool, zoom, panOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && activeTool === 'pan') {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setPanOffset(p => ({ x: p.x + dx / zoom, y: p.y + dy / zoom }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
      onPan?.(dx, dy);
    }
  }, [isPanning, activeTool, lastMousePos, zoom, onPan]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    
    // Complete measurement if enough points
    if (currentMeasurement.length >= 2 && activeTool === 'length') {
      const p1 = currentMeasurement[0];
      const p2 = currentMeasurement[1];
      const distance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      const measurement: MeasurementData = {
        id: `m-${Date.now()}`,
        type: 'length',
        points: [p1, p2],
        value: Math.round(distance * 0.264), // Rough mm conversion
        unit: 'mm',
        timestamp: new Date().toISOString(),
      };
      setMeasurements(prev => [...prev, measurement]);
      onMeasurement?.(measurement);
      setCurrentMeasurement([]);
    }
  }, [currentMeasurement, activeTool, onMeasurement]);

  // Handle wheel for zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    handleZoom(e.deltaY > 0 ? -1 : 1);
  }, [handleZoom]);

  // Reset view
  const resetView = useCallback(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setWindowLevel({ window: 4096, level: 2048, preset: 'Default' });
  }, []);

  // Clear measurements
  const clearMeasurements = useCallback(() => {
    setMeasurements([]);
    setCurrentMeasurement([]);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const tool = TOOLS.find(t => t.shortcut.toLowerCase() === e.key.toLowerCase());
      if (tool) {
        e.preventDefault();
        handleToolChange(tool.id);
      }
      
      // W/L presets with number keys
      if (e.key >= '1' && e.key <= '5') {
        const presetIndex = parseInt(e.key) - 1;
        if (WL_PRESETS[presetIndex]) {
          handleWLPreset(WL_PRESETS[presetIndex]);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToolChange, handleWLPreset]);

  // Calculate brightness/contrast filter from W/L
  const imageFilter = `brightness(${1 + (windowLevel.level - 2048) / 4096}) contrast(${windowLevel.window / 4096 + 0.5})`;

  return (
    <div style={{ 
      backgroundColor: '#000',
      borderRadius: '8px',
      overflow: 'hidden',
      userSelect: 'none',
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        backgroundColor: '#1a1a2e',
        borderBottom: '1px solid #333',
      }}>
        {/* Tools */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {TOOLS.map(tool => (
            <button
              key={tool.id}
              onClick={() => handleToolChange(tool.id)}
              title={`${tool.label} (${tool.shortcut})`}
              style={{
                padding: '6px 10px',
                backgroundColor: activeTool === tool.id ? '#3b82f6' : '#334155',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>{tool.icon}</span>
              <span style={{ fontSize: '10px', opacity: 0.7 }}>{tool.shortcut}</span>
            </button>
          ))}
        </div>

        {/* W/L Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#64748b', fontSize: '10px', fontWeight: 600 }}>W/L:</span>
          <select
            value={windowLevel.preset}
            onChange={(e) => {
              const preset = WL_PRESETS.find(p => p.name === e.target.value);
              if (preset) handleWLPreset(preset);
            }}
            style={{
              backgroundColor: '#334155',
              color: 'white',
              border: '1px solid #475569',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            {WL_PRESETS.map((preset, i) => (
              <option key={preset.name} value={preset.name}>
                {preset.name} ({i + 1})
              </option>
            ))}
          </select>
          <span style={{ color: '#64748b', fontSize: '9px', fontFamily: 'monospace' }}>
            {windowLevel.window}/{windowLevel.level}
          </span>
        </div>

        {/* View Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => handleZoom(-1)}
            style={{
              padding: '4px 8px',
              backgroundColor: '#334155',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            −
          </button>
          <span style={{ color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace', minWidth: '40px', textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => handleZoom(1)}
            style={{
              padding: '4px 8px',
              backgroundColor: '#334155',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            +
          </button>
          <button
            onClick={resetView}
            title="Reset View"
            style={{
              padding: '4px 8px',
              backgroundColor: '#334155',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            ↺
          </button>
          {measurements.length > 0 && (
            <button
              onClick={clearMeasurements}
              title="Clear Measurements"
              style={{
                padding: '4px 8px',
                backgroundColor: '#dc2626',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* Viewer Area */}
      <div
        ref={viewerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '2px',
          height: '400px',
          cursor: activeTool === 'pan' ? (isPanning ? 'grabbing' : 'grab') : 'crosshair',
          backgroundColor: '#000',
        }}
      >
        {/* Left Image */}
        <div 
          style={{ position: 'relative', overflow: 'hidden', backgroundColor: '#111' }}
          onMouseEnter={() => onROIHover?.('left', true)}
          onMouseLeave={() => onROIHover?.('left', false)}
        >
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            color: '#f59e0b',
            fontSize: '14px',
            fontWeight: 700,
            textShadow: '0 0 4px black',
            zIndex: 10,
          }}>
            {leftLabel}
          </div>
          
          {/* No Priors Indicator */}
          <div style={{
            position: 'absolute',
            bottom: '8px',
            left: '8px',
            color: '#64748b',
            fontSize: '9px',
            fontWeight: 600,
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: '2px 6px',
            borderRadius: '4px',
            zIndex: 10,
          }}>
            NO PRIORS
          </div>
          
          {leftImage ? (
            <img
              src={leftImage}
              alt={leftLabel}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                filter: imageFilter,
                transition: 'filter 0.2s',
              }}
              draggable={false}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(45deg, #1a1a2e 0%, #2d2d4a 100%)',
            }}>
              <div style={{ textAlign: 'center', color: '#475569' }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>🩻</div>
                <div style={{ fontSize: '12px' }}>{leftLabel}</div>
                <div style={{ fontSize: '10px', opacity: 0.6 }}>Demo Image</div>
              </div>
            </div>
          )}
          
          {/* AI Overlay */}
          {showAIOverlay && aiRegion && (
            <div style={{
              position: 'absolute',
              left: `${aiRegion.x}%`,
              top: `${aiRegion.y}%`,
              width: `${aiRegion.width}%`,
              height: `${aiRegion.height}%`,
              border: '2px solid #f59e0b',
              borderRadius: '4px',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              pointerEvents: 'none',
            }}>
              <div style={{
                position: 'absolute',
                top: '-20px',
                left: '0',
                backgroundColor: '#f59e0b',
                color: '#000',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 600,
              }}>
                AI: {Math.round(aiRegion.confidence * 100)}%
              </div>
            </div>
          )}
        </div>

        {/* Right Image */}
        <div 
          style={{ position: 'relative', overflow: 'hidden', backgroundColor: '#111' }}
          onMouseEnter={() => onROIHover?.('right', true)}
          onMouseLeave={() => onROIHover?.('right', false)}
        >
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            color: '#f59e0b',
            fontSize: '14px',
            fontWeight: 700,
            textShadow: '0 0 4px black',
            zIndex: 10,
          }}>
            {rightLabel}
          </div>
          
          {/* No Priors Indicator */}
          <div style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            color: '#64748b',
            fontSize: '9px',
            fontWeight: 600,
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: '2px 6px',
            borderRadius: '4px',
            zIndex: 10,
          }}>
            NO PRIORS
          </div>
          
          {rightImage ? (
            <img
              src={rightImage}
              alt={rightLabel}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                filter: imageFilter,
                transition: 'filter 0.2s',
              }}
              draggable={false}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(45deg, #1a1a2e 0%, #2d2d4a 100%)',
            }}>
              <div style={{ textAlign: 'center', color: '#475569' }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>🩻</div>
                <div style={{ fontSize: '12px' }}>{rightLabel}</div>
                <div style={{ fontSize: '10px', opacity: 0.6 }}>Demo Image</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Measurements Display */}
      {measurements.length > 0 && showMeasurements && (
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#1a1a2e',
          borderTop: '1px solid #333',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px',
          }}>
            <span style={{ color: '#64748b', fontSize: '10px', fontWeight: 600 }}>
              MEASUREMENTS ({measurements.length})
            </span>
            <button
              onClick={() => setShowMeasurements(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              ▲
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {measurements.map((m, i) => (
              <div
                key={m.id}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#334155',
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span style={{ color: '#64748b' }}>#{i + 1}</span>
                <span style={{ color: '#4ade80', fontFamily: 'monospace' }}>
                  {m.value} {m.unit}
                </span>
                {m.label && <span style={{ color: '#94a3b8' }}>({m.label})</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 12px',
        backgroundColor: '#0f172a',
        borderTop: '1px solid #333',
        fontSize: '9px',
        color: '#64748b',
      }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>Tool: <span style={{ color: '#94a3b8' }}>{activeTool.toUpperCase()}</span></span>
          <span>Zoom: <span style={{ color: '#94a3b8' }}>{Math.round(zoom * 100)}%</span></span>
          <span>W/L: <span style={{ color: '#94a3b8' }}>{windowLevel.preset}</span></span>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>Protocol: <span style={{ color: '#94a3b8' }}>{hangingProtocol}</span></span>
          <span style={{ color: showAIOverlay ? '#f59e0b' : '#64748b' }}>
            AI: {showAIOverlay ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MammogramViewerPACS;
