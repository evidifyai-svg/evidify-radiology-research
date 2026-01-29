/**
 * MammogramViewer.tsx
 * 
 * Enhanced 4-view mammogram viewer with:
 * - Dynamic case images
 * - Pan/zoom/window-level controls
 * - AI overlay toggle
 * - Viewport interaction logging
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

export interface MammogramImages {
  RCC: string;
  LCC: string;
  RMLO: string;
  LMLO: string;
}

export interface AIFinding {
  viewKey: 'RCC' | 'LCC' | 'RMLO' | 'LMLO';
  confidence: number;
  boundingBox?: {
    top: string;
    right: string;
    width: number;
    height: number;
  };
}

export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
  windowCenter: number;
  windowWidth: number;
}

export interface ViewerInteraction {
  type: 'VIEW_FOCUSED' | 'ZOOM_CHANGED' | 'PAN_CHANGED' | 'WINDOW_LEVEL_CHANGED';
  viewKey?: string;
  state: ViewportState;
  timestamp: string;
}

interface MammogramViewerProps {
  images: MammogramImages;
  caseId: string;
  metadata?: {
    patientAge?: number;
    breastDensity?: string;
  };
  showAI?: boolean;
  aiFindings?: AIFinding[];
  onInteraction?: (interaction: ViewerInteraction) => void;
}

// Default INbreast images for fallback
const DEFAULT_IMAGES: MammogramImages = {
  RCC: '/images/inbreast/20586908_6c613a14b80a8591_MG_R_CC_ANON.png',
  LCC: '/images/inbreast/20586934_6c613a14b80a8591_MG_L_CC_ANON.png',
  RMLO: '/images/inbreast/20586960_6c613a14b80a8591_MG_R_ML_ANON.png',
  LMLO: '/images/inbreast/20586986_6c613a14b80a8591_MG_L_ML_ANON.png',
};

export const MammogramViewer: React.FC<MammogramViewerProps> = ({
  images = DEFAULT_IMAGES,
  caseId,
  metadata,
  showAI = false,
  aiFindings = [],
  onInteraction,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<ViewportState>({
    zoom: 1,
    panX: 0,
    panY: 0,
    windowCenter: 0.5,
    windowWidth: 1.0,
  });
  const [activeView, setActiveView] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isRightDrag, setIsRightDrag] = useState(false);
  const [viewsLinked, setViewsLinked] = useState(true);

  // Non-passive wheel handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const newZoom = Math.max(0.5, Math.min(4, viewport.zoom * (e.deltaY > 0 ? 0.9 : 1.1)));
      setViewport(prev => ({ ...prev, zoom: newZoom }));
      emitInteraction('ZOOM_CHANGED', activeView || undefined);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [viewport.zoom, activeView]);

  const emitInteraction = useCallback((type: ViewerInteraction['type'], viewKey?: string) => {
    if (onInteraction) {
      onInteraction({
        type,
        viewKey,
        state: viewport,
        timestamp: new Date().toISOString(),
      });
    }
  }, [onInteraction, viewport]);

  const handleMouseDown = useCallback((e: React.MouseEvent, viewKey: string) => {
    e.preventDefault();
    setActiveView(viewKey);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setIsRightDrag(e.button === 2);
    emitInteraction('VIEW_FOCUSED', viewKey);
  }, [emitInteraction]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    if (isRightDrag) {
      setViewport(prev => ({
        ...prev,
        windowCenter: Math.max(0, Math.min(1, prev.windowCenter + deltaY * 0.002)),
        windowWidth: Math.max(0.1, Math.min(2, prev.windowWidth + deltaX * 0.002)),
      }));
      emitInteraction('WINDOW_LEVEL_CHANGED', activeView || undefined);
    } else {
      setViewport(prev => ({
        ...prev,
        panX: prev.panX + deltaX,
        panY: prev.panY + deltaY,
      }));
      emitInteraction('PAN_CHANGED', activeView || undefined);
    }
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragStart, isRightDrag, activeView, emitInteraction]);

  const handleMouseUp = () => setIsDragging(false);

  const handleReset = () => {
    setViewport({
      zoom: 1,
      panX: 0,
      panY: 0,
      windowCenter: 0.5,
      windowWidth: 1.0,
    });
  };

  const brightness = 0.5 + viewport.windowCenter;
  const contrast = viewport.windowWidth;

  const getAIFinding = (viewKey: string): AIFinding | undefined => {
    return aiFindings.find(f => f.viewKey === viewKey);
  };

  const renderView = (viewKey: 'RCC' | 'LCC' | 'RMLO' | 'LMLO') => {
    const isRight = viewKey.startsWith('R');
    const finding = showAI ? getAIFinding(viewKey) : undefined;
    const imageSrc = images[viewKey];
    
    return (
      <div
        style={{
          backgroundColor: '#000',
          border: activeView === viewKey ? '2px solid #3b82f6' : '1px solid #333',
          borderRadius: '4px',
          aspectRatio: '3/4',
          position: 'relative',
          cursor: isDragging ? (isRightDrag ? 'ns-resize' : 'grabbing') : 'crosshair',
          overflow: 'hidden',
          userSelect: 'none',
        }}
        onMouseDown={(e) => handleMouseDown(e, viewKey)}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
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
          {isRight ? 'R' : 'L'} {viewKey.slice(1)}
        </div>
        
        {/* Image layer */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${viewport.zoom}) translate(${viewport.panX / viewport.zoom}px, ${viewport.panY / viewport.zoom}px)`,
          filter: `brightness(${brightness}) contrast(${contrast})`,
          transition: isDragging ? 'none' : 'transform 0.1s',
        }}>
          <img
            src={imageSrc}
            alt={viewKey}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', pointerEvents: 'none' }}
            draggable={false}
            onError={(e) => {
              // Fallback to default if image fails to load
              (e.target as HTMLImageElement).src = DEFAULT_IMAGES[viewKey];
            }}
          />
        </div>

        {/* AI overlay */}
        {finding && (
          <div style={{
            position: 'absolute',
            top: finding.boundingBox?.top || '30%',
            right: finding.boundingBox?.right || '25%',
            width: finding.boundingBox?.width || 80,
            height: finding.boundingBox?.height || 80,
            border: '2px solid #a855f7',
            backgroundColor: 'rgba(168,85,247,0.2)',
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
              AI: {finding.confidence}%
            </div>
          </div>
        )}

        {/* Zoom indicator */}
        {viewport.zoom !== 1 && (
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
            {Math.round(viewport.zoom * 100)}%
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
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 16px',
        backgroundColor: '#1f2937',
        borderBottom: '1px solid #374151',
      }}>
        <span style={{ color: '#d1d5db', fontSize: 13 }}>
          Case: {caseId}
          {metadata?.patientAge && <span style={{ marginLeft: 16, color: '#9ca3af' }}>Age: {metadata.patientAge}</span>}
          {metadata?.breastDensity && <span style={{ marginLeft: 8, color: '#9ca3af' }}>Density: {metadata.breastDensity}</span>}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setViewport(v => ({ ...v, zoom: Math.max(0.5, v.zoom - 0.25) }))}
            style={{ padding: '6px 10px', backgroundColor: '#374151', border: 'none', borderRadius: 4, color: '#d1d5db', cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}
          >
            −
          </button>
          <span style={{ color: '#9ca3af', fontSize: 12, width: 50, textAlign: 'center', fontFamily: 'monospace' }}>
            {Math.round(viewport.zoom * 100)}%
          </span>
          <button
            onClick={() => setViewport(v => ({ ...v, zoom: Math.min(4, v.zoom + 0.25) }))}
            style={{ padding: '6px 10px', backgroundColor: '#374151', border: 'none', borderRadius: 4, color: '#d1d5db', cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}
          >
            +
          </button>
          <div style={{ width: 1, height: 20, backgroundColor: '#4b5563', margin: '0 8px' }} />
          <button
            onClick={handleReset}
            style={{ padding: '6px 10px', backgroundColor: '#374151', border: 'none', borderRadius: 4, color: '#d1d5db', cursor: 'pointer', fontSize: 12 }}
          >
            ↺ Reset
          </button>
          <button
            onClick={() => setViewsLinked(v => !v)}
            style={{ padding: '6px 10px', backgroundColor: viewsLinked ? '#2563eb' : '#374151', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer', fontSize: 12 }}
          >
            {viewsLinked ? 'Linked' : 'Unlinked'}
          </button>
          {showAI && aiFindings.length > 0 && (
            <span style={{ marginLeft: 8, padding: '6px 12px', backgroundColor: '#7c3aed', borderRadius: 4, color: 'white', fontSize: 12, fontWeight: 500 }}>
              AI Active
            </span>
          )}
        </div>
      </div>

      {/* Views grid */}
      <div style={{ padding: 8, backgroundColor: '#0f172a' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          {renderView('RCC')}
          {renderView('LCC')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {renderView('RMLO')}
          {renderView('LMLO')}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 16px',
        backgroundColor: '#1f2937',
        borderTop: '1px solid #374151',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 11,
        color: '#9ca3af',
      }}>
        <span><strong>Controls:</strong> Scroll = zoom • Left-drag = pan • Right-drag = window/level</span>
        <span style={{ color: '#f59e0b' }}>Research simulation • Not for clinical use</span>
      </div>
    </div>
  );
};

export default MammogramViewer;
