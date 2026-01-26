import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Link, 
  Unlink,
  Eye, 
  EyeOff,
  Sun,
  Maximize2,
  Grid3X3
} from 'lucide-react';
import type { 
  MammogramCase, 
  MammogramViewerState, 
  AIPresentation,
  LesionAnnotation,
  ViewerInteractionEvent 
} from '../../types/imaging';

interface MammogramDualViewProps {
  mammogramCase: MammogramCase;
  aiPresentation?: AIPresentation;
  onInteraction?: (event: ViewerInteractionEvent) => void;
  // Which side to show (for single-breast studies or mastectomy cases)
  showLaterality?: 'both' | 'left' | 'right';
  // Initial state
  initialShowAI?: boolean;
}

interface SingleViewPaneProps {
  viewKey: 'LCC' | 'LMLO' | 'RCC' | 'RMLO';
  imageSrc?: string;
  width: number;
  height: number;
  zoom: number;
  panX: number;
  panY: number;
  windowCenter: number;
  windowWidth: number;
  isActive: boolean;
  showAIOverlay: boolean;
  aiAnnotation?: LesionAnnotation;
  aiConfidence?: number;
  onFocus: () => void;
  onZoomPan: (zoom: number, panX: number, panY: number) => void;
  onWindowLevel: (center: number, width: number) => void;
  viewsLinked: boolean;
}

const SingleViewPane: React.FC<SingleViewPaneProps> = ({
  viewKey,
  imageSrc,
  width,
  height,
  zoom,
  panX,
  panY,
  windowCenter,
  windowWidth,
  isActive,
  showAIOverlay,
  aiAnnotation,
  aiConfidence,
  onFocus,
  onZoomPan,
  onWindowLevel,
  viewsLinked,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isWindowLevelMode, setIsWindowLevelMode] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    onFocus();
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  }, [onFocus, panX, panY]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    
    if (isWindowLevelMode) {
      // Right-drag for window/level (standard PACS behavior)
      const deltaX = e.movementX;
      const deltaY = e.movementY;
      onWindowLevel(
        windowCenter + deltaY * 10,
        Math.max(1, windowWidth + deltaX * 10)
      );
    } else {
      // Left-drag for pan
      onZoomPan(zoom, e.clientX - dragStart.x, e.clientY - dragStart.y);
    }
  }, [isDragging, isWindowLevelMode, zoom, dragStart, onZoomPan, onWindowLevel, windowCenter, windowWidth]);

  const handleMouseUp = () => setIsDragging(false);
  
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(8, zoom * delta));
    onZoomPan(newZoom, panX, panY);
  }, [zoom, panX, panY, onZoomPan]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsWindowLevelMode(true);
  };

  // View label based on position
  const viewLabel = viewKey;
  const laterality = viewKey.startsWith('L') ? 'LEFT' : 'RIGHT';

  return (
    <div
      ref={containerRef}
      className={`relative bg-black overflow-hidden select-none ${
        isActive ? 'ring-2 ring-blue-500' : 'ring-1 ring-slate-700'
      }`}
      style={{ aspectRatio: `${width} / ${height}` }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
    >
      {/* View label overlay */}
      <div className="absolute top-2 left-2 z-20 bg-black/70 px-2 py-1 rounded text-xs font-mono text-white">
        {laterality} {viewKey.slice(1)}
      </div>

      {/* Image layer with transforms */}
      <div
        className="absolute inset-0 transition-transform duration-75"
        style={{
          transform: `scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
          transformOrigin: 'center center',
          // CSS filter for window/level simulation (approximation for web)
          filter: `contrast(${windowWidth / 2000}) brightness(${1 + (windowCenter - 2000) / 4000})`,
        }}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={`Mammogram ${viewKey}`}
            className="w-full h-full object-contain"
            draggable={false}
          />
        ) : (
          // Placeholder when no image loaded
          <div className="w-full h-full bg-gradient-to-br from-slate-900 to-black flex items-center justify-center">
            <div className="text-slate-600 text-sm">
              {viewKey}
              <div className="text-xs mt-1 text-slate-700">No image loaded</div>
            </div>
          </div>
        )}
      </div>

      {/* AI Annotation Overlay */}
      {showAIOverlay && aiAnnotation && (
        <div
          className="absolute pointer-events-none z-10"
          style={{
            left: `${aiAnnotation.boundingBox.x * 100}%`,
            top: `${aiAnnotation.boundingBox.y * 100}%`,
            width: `${aiAnnotation.boundingBox.width * 100}%`,
            height: `${aiAnnotation.boundingBox.height * 100}%`,
            transform: `scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
          }}
        >
          {/* Bounding box */}
          <div className="absolute inset-0 border-2 border-purple-500 bg-purple-500/10 rounded">
            {/* Confidence label */}
            {aiConfidence !== undefined && (
              <div className="absolute -top-6 left-0 text-xs text-purple-400 bg-black/80 px-1 rounded whitespace-nowrap">
                AI: {aiConfidence}%
              </div>
            )}
          </div>
          
          {/* Contour overlay if available */}
          {aiAnnotation.contourPoints && aiAnnotation.contourPoints.length > 0 && (
            <svg className="absolute inset-0 w-full h-full overflow-visible">
              <polygon
                points={aiAnnotation.contourPoints
                  .map(p => `${p.x * 100}%,${p.y * 100}%`)
                  .join(' ')}
                fill="rgba(168, 85, 247, 0.2)"
                stroke="#a855f7"
                strokeWidth="2"
                strokeDasharray="4,2"
              />
            </svg>
          )}
        </div>
      )}

      {/* Zoom indicator */}
      {zoom !== 1 && (
        <div className="absolute bottom-2 left-2 z-20 bg-black/70 px-2 py-1 rounded text-xs text-slate-300">
          {Math.round(zoom * 100)}%
        </div>
      )}

      {/* Link indicator */}
      {viewsLinked && (
        <div className="absolute bottom-2 right-2 z-20">
          <Link size={12} className="text-blue-400" />
        </div>
      )}
    </div>
  );
};

export const MammogramDualView: React.FC<MammogramDualViewProps> = ({
  mammogramCase,
  aiPresentation,
  onInteraction,
  showLaterality = 'both',
  initialShowAI = true,
}) => {
  // Viewer state for each view
  const [viewerState, setViewerState] = useState<MammogramViewerState>({
    zoom: 1,
    panX: 0,
    panY: 0,
    windowCenter: 2000,
    windowWidth: 4000,
    activeView: null,
    viewsLinked: true,
    showAIOverlay: initialShowAI,
    aiDisplayMode: aiPresentation?.displayMode || 'NONE',
  });

  // Log interaction event
  const logInteraction = useCallback((
    eventType: ViewerInteractionEvent['eventType'],
    viewKey?: 'LCC' | 'LMLO' | 'RCC' | 'RMLO',
    details: Record<string, unknown> = {}
  ) => {
    if (onInteraction) {
      onInteraction({
        timestamp: new Date().toISOString(),
        eventType,
        viewKey,
        details,
      });
    }
  }, [onInteraction]);

  // Handlers
  const handleViewFocus = useCallback((viewKey: 'LCC' | 'LMLO' | 'RCC' | 'RMLO') => {
    setViewerState(prev => ({ ...prev, activeView: viewKey }));
    logInteraction('VIEW_FOCUSED', viewKey);
  }, [logInteraction]);

  const handleZoomPan = useCallback((viewKey: 'LCC' | 'LMLO' | 'RCC' | 'RMLO', zoom: number, panX: number, panY: number) => {
    setViewerState(prev => {
      if (prev.viewsLinked) {
        // Apply to all views when linked
        return { ...prev, zoom, panX, panY };
      } else {
        // Only apply to active view (would need per-view state for this)
        return { ...prev, zoom, panX, panY };
      }
    });
    logInteraction('ZOOM_CHANGED', viewKey, { zoom, panX, panY });
  }, [logInteraction]);

  const handleWindowLevel = useCallback((viewKey: 'LCC' | 'LMLO' | 'RCC' | 'RMLO', center: number, width: number) => {
    setViewerState(prev => ({ ...prev, windowCenter: center, windowWidth: width }));
    logInteraction('WINDOW_LEVEL_CHANGED', viewKey, { center, width });
  }, [logInteraction]);

  const handleReset = () => {
    setViewerState(prev => ({
      ...prev,
      zoom: 1,
      panX: 0,
      panY: 0,
      windowCenter: 2000,
      windowWidth: 4000,
    }));
  };

  const toggleViewsLinked = () => {
    setViewerState(prev => ({ ...prev, viewsLinked: !prev.viewsLinked }));
    logInteraction('VIEWS_LINKED_TOGGLED', undefined, { linked: !viewerState.viewsLinked });
  };

  const toggleAIOverlay = () => {
    setViewerState(prev => ({ ...prev, showAIOverlay: !prev.showAIOverlay }));
    logInteraction('AI_OVERLAY_TOGGLED', undefined, { visible: !viewerState.showAIOverlay });
  };

  // Determine which views to show
  const showLeft = showLaterality === 'both' || showLaterality === 'left';
  const showRight = showLaterality === 'both' || showLaterality === 'right';

  // Get AI finding for a specific view
  const getAIFinding = (viewKey: 'LCC' | 'LMLO' | 'RCC' | 'RMLO') => {
    return aiPresentation?.viewFindings?.[viewKey];
  };

  return (
    <div className="bg-slate-900 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400 font-medium">
            Case: {mammogramCase.caseId}
            {mammogramCase.breastDensity && (
              <span className="ml-2 text-xs text-slate-500">
                Density: {mammogramCase.breastDensity}
              </span>
            )}
          </span>
        </div>

        {/* View controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleZoomPan('LCC', Math.max(0.5, viewerState.zoom - 0.25), viewerState.panX, viewerState.panY)}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>
          <span className="text-xs text-slate-500 w-12 text-center">
            {Math.round(viewerState.zoom * 100)}%
          </span>
          <button
            onClick={() => handleZoomPan('LCC', Math.min(8, viewerState.zoom + 0.25), viewerState.panX, viewerState.panY)}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
          
          <div className="w-px h-4 bg-slate-600 mx-1" />
          
          <button
            onClick={handleReset}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Reset View"
          >
            <RotateCcw size={16} />
          </button>
          
          <button
            onClick={toggleViewsLinked}
            className={`p-1.5 rounded transition-colors ${
              viewerState.viewsLinked 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'hover:bg-slate-700 text-slate-400 hover:text-white'
            }`}
            title={viewerState.viewsLinked ? 'Unlink Views' : 'Link Views'}
          >
            {viewerState.viewsLinked ? <Link size={16} /> : <Unlink size={16} />}
          </button>

          {aiPresentation && aiPresentation.displayMode !== 'NONE' && (
            <>
              <div className="w-px h-4 bg-slate-600 mx-1" />
              <button
                onClick={toggleAIOverlay}
                className={`p-1.5 rounded transition-colors ${
                  viewerState.showAIOverlay 
                    ? 'bg-purple-600 text-white hover:bg-purple-700' 
                    : 'hover:bg-slate-700 text-slate-400 hover:text-white'
                }`}
                title={viewerState.showAIOverlay ? 'Hide AI Overlay' : 'Show AI Overlay'}
              >
                {viewerState.showAIOverlay ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main viewing area - Standard hanging protocol: CC on top, MLO on bottom */}
      <div className="p-2">
        {/* Row 1: CC views */}
        <div className="flex gap-2 mb-2">
          {showRight && (
            <div className="flex-1">
              <SingleViewPane
                viewKey="RCC"
                imageSrc={mammogramCase.views.RCC.webImagePath}
                width={mammogramCase.views.RCC.width}
                height={mammogramCase.views.RCC.height}
                zoom={viewerState.zoom}
                panX={viewerState.panX}
                panY={viewerState.panY}
                windowCenter={viewerState.windowCenter}
                windowWidth={viewerState.windowWidth}
                isActive={viewerState.activeView === 'RCC'}
                showAIOverlay={viewerState.showAIOverlay}
                aiAnnotation={getAIFinding('RCC')?.annotation}
                aiConfidence={getAIFinding('RCC')?.confidence}
                onFocus={() => handleViewFocus('RCC')}
                onZoomPan={(z, x, y) => handleZoomPan('RCC', z, x, y)}
                onWindowLevel={(c, w) => handleWindowLevel('RCC', c, w)}
                viewsLinked={viewerState.viewsLinked}
              />
            </div>
          )}
          {showLeft && (
            <div className="flex-1">
              <SingleViewPane
                viewKey="LCC"
                imageSrc={mammogramCase.views.LCC.webImagePath}
                width={mammogramCase.views.LCC.width}
                height={mammogramCase.views.LCC.height}
                zoom={viewerState.zoom}
                panX={viewerState.panX}
                panY={viewerState.panY}
                windowCenter={viewerState.windowCenter}
                windowWidth={viewerState.windowWidth}
                isActive={viewerState.activeView === 'LCC'}
                showAIOverlay={viewerState.showAIOverlay}
                aiAnnotation={getAIFinding('LCC')?.annotation}
                aiConfidence={getAIFinding('LCC')?.confidence}
                onFocus={() => handleViewFocus('LCC')}
                onZoomPan={(z, x, y) => handleZoomPan('LCC', z, x, y)}
                onWindowLevel={(c, w) => handleWindowLevel('LCC', c, w)}
                viewsLinked={viewerState.viewsLinked}
              />
            </div>
          )}
        </div>

        {/* Row 2: MLO views */}
        <div className="flex gap-2">
          {showRight && (
            <div className="flex-1">
              <SingleViewPane
                viewKey="RMLO"
                imageSrc={mammogramCase.views.RMLO.webImagePath}
                width={mammogramCase.views.RMLO.width}
                height={mammogramCase.views.RMLO.height}
                zoom={viewerState.zoom}
                panX={viewerState.panX}
                panY={viewerState.panY}
                windowCenter={viewerState.windowCenter}
                windowWidth={viewerState.windowWidth}
                isActive={viewerState.activeView === 'RMLO'}
                showAIOverlay={viewerState.showAIOverlay}
                aiAnnotation={getAIFinding('RMLO')?.annotation}
                aiConfidence={getAIFinding('RMLO')?.confidence}
                onFocus={() => handleViewFocus('RMLO')}
                onZoomPan={(z, x, y) => handleZoomPan('RMLO', z, x, y)}
                onWindowLevel={(c, w) => handleWindowLevel('RMLO', c, w)}
                viewsLinked={viewerState.viewsLinked}
              />
            </div>
          )}
          {showLeft && (
            <div className="flex-1">
              <SingleViewPane
                viewKey="LMLO"
                imageSrc={mammogramCase.views.LMLO.webImagePath}
                width={mammogramCase.views.LMLO.width}
                height={mammogramCase.views.LMLO.height}
                zoom={viewerState.zoom}
                panX={viewerState.panX}
                panY={viewerState.panY}
                windowCenter={viewerState.windowCenter}
                windowWidth={viewerState.windowWidth}
                isActive={viewerState.activeView === 'LMLO'}
                showAIOverlay={viewerState.showAIOverlay}
                aiAnnotation={getAIFinding('LMLO')?.annotation}
                aiConfidence={getAIFinding('LMLO')?.confidence}
                onFocus={() => handleViewFocus('LMLO')}
                onZoomPan={(z, x, y) => handleZoomPan('LMLO', z, x, y)}
                onWindowLevel={(c, w) => handleWindowLevel('LMLO', c, w)}
                viewsLinked={viewerState.viewsLinked}
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer with instructions */}
      <div className="px-4 py-2 bg-slate-800 border-t border-slate-700 text-xs text-slate-500 flex justify-between">
        <span>Scroll to zoom • Drag to pan • Right-drag for window/level</span>
        <span>Research simulation • Not for clinical use</span>
      </div>
    </div>
  );
};

export default MammogramDualView;
