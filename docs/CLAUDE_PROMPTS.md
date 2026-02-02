# Evidify Implementation Prompts

## Prompt 3: Cornerstone3D DICOM Viewer

Implement Cornerstone3D DICOM viewer for Evidify.

### Files to Create:

1. src/lib/cornerstone/init.ts - Initialize Cornerstone3D:
   - Call cornerstone.init()
   - Configure DICOM image loader with web workers
   - Register wadouri and wadors image loaders

2. src/lib/cornerstone/viewportBridge.ts - Bridge to existing tracker:
   - Listen to CAMERA_MODIFIED events
   - Call existing tracker.recordViewportState()

3. src/components/viewer/CornerstoneDICOMViewer.tsx - Main component:
   - Render DICOM images
   - Support zoom, pan, window/level
   - Connect to viewport bridge

### Event Types to Add:
STUDY_LOADED, SERIES_CHANGED, IMAGE_RENDERED, WINDOW_LEVEL_CHANGED

### Critical: Must integrate with existing code at:
- src/hooks/useViewportTracking.ts
- src/lib/event_logger.ts
