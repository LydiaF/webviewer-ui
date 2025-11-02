import React, { useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import core from 'core';
import selectors from 'selectors';
import actions from 'actions';
import DataElements from 'constants/dataElement';
import LinkedEntityIndicator from './LinkedEntityIndicator';
import './LinkedEntityIndicator.scss';

// Log immediately when module loads
console.log('LinkedEntityIndicatorContainer: MODULE LOADED');

const LinkedEntityIndicatorContainer = () => {
  const dispatch = useDispatch();
  const customizableUI = useSelector((state) => selectors.getFeatureFlags(state)?.customizableUI);
  const [annotationsWithLinks, setAnnotationsWithLinks] = useState([]);

  console.log('LinkedEntityIndicatorContainer: rendered, customizableUI:', customizableUI);

  // Enable and open the element when customizableUI is enabled
  useEffect(() => {
    if (customizableUI) {
      dispatch(actions.openElement(DataElements.LINKED_ENTITY_INDICATOR_CONTAINER));
      console.log('LinkedEntityIndicatorContainer: Enabled element');
    }
  }, [customizableUI, dispatch]);

  const updateAnnotations = useCallback(() => {
    console.log('LinkedEntityIndicatorContainer: updateAnnotations called, customizableUI:', customizableUI);
    if (!customizableUI) {
      console.log('LinkedEntityIndicatorContainer: customizableUI is false, clearing');
      setAnnotationsWithLinks([]);
      return;
    }

    if (!core) {
      console.log('LinkedEntityIndicatorContainer: core is not available yet');
      setAnnotationsWithLinks([]);
      return;
    }

    const annotationManager = core.getAnnotationManager();
    if (!annotationManager) {
      console.log('LinkedEntityIndicatorContainer: No annotationManager');
      setAnnotationsWithLinks([]);
      return;
    }

    const allAnnotations = annotationManager.getAnnotationsList();
    console.log('LinkedEntityIndicatorContainer: Checking', allAnnotations.length, 'annotations');

    const withLinks = allAnnotations.filter((ann) => {
      const linkedEntities = ann.LinkedEntities || ann.linkedEntities;
      const hasLinks = Array.isArray(linkedEntities) && linkedEntities.length > 0;
      if (hasLinks) {
        console.log('LinkedEntityIndicatorContainer: Found annotation with links:', ann.Id || ann.id, linkedEntities.length, linkedEntities);
      }
      return hasLinks;
    });

    console.log('LinkedEntityIndicatorContainer: Found', withLinks.length, 'annotations with linked entities');
    setAnnotationsWithLinks(withLinks);
  }, [customizableUI]);

  useEffect(() => {
    if (!customizableUI) return;

    updateAnnotations();

    const handleAnnotationChanged = () => {
      // Small delay to ensure LinkedEntities are updated on annotation object
      setTimeout(() => updateAnnotations(), 100);
    };

    const handleMessage = (event) => {
      if (
        event.data?.type === 'linkedEntitiesRefreshed' ||
        event.data?.type === 'linkedEntitiesUpdated' ||
        event.data?.type === 'entityLinkedToAnnotation' ||
        event.data?.type === 'unlinkEntityFromAnnotation'
      ) {
        // Update immediately and also after a delay to catch any async updates
        updateAnnotations();
        setTimeout(() => updateAnnotations(), 150);
      }
    };

    // Skip core event listeners for now - they're causing errors when core isn't fully initialized
    // We'll rely on message-based updates and manual refresh calls instead
    let coreListenersAdded = false;
    let coreListenersTimeoutId = null;

    // Only try to add listeners if document is loaded (checked via getDocument)
    try {
      if (core?.getDocument?.() && core.addEventListener) {
        try {
          core.addEventListener('annotationChanged', handleAnnotationChanged);
          core.addEventListener('annotationAdded', handleAnnotationChanged);
          core.addEventListener('annotationDeleted', handleAnnotationChanged);
          coreListenersAdded = true;
        } catch (e) {
          // Silently fail - we'll rely on message-based updates
          console.warn('LinkedEntityIndicatorContainer: Could not add core listeners, using message-based updates only');
        }
      } else {
        // Retry after a delay if document isn't loaded yet
        coreListenersTimeoutId = setTimeout(() => {
          try {
            if (core?.getDocument?.() && core.addEventListener) {
              core.addEventListener('annotationChanged', handleAnnotationChanged);
              core.addEventListener('annotationAdded', handleAnnotationChanged);
              core.addEventListener('annotationDeleted', handleAnnotationChanged);
              coreListenersAdded = true;
            }
          } catch (e) {
            // Silently fail
          }
        }, 1000);
      }
    } catch (e) {
      // Silently fail - message-based updates will handle it
    }

    window.addEventListener('message', handleMessage);

    // Get documentViewer with proper checks
    let documentViewer = null;
    let documentViewerTimeoutId = null;

    try {
      if (core && typeof core.getDocumentViewer === 'function') {
        documentViewer = core.getDocumentViewer();
      }
    } catch (e) {
      console.warn('LinkedEntityIndicatorContainer: Error getting documentViewer', e);
    }

    // Add documentViewer listeners if available
    if (documentViewer && typeof documentViewer.addEventListener === 'function') {
      documentViewer.addEventListener('zoomUpdated', handleAnnotationChanged);
      documentViewer.addEventListener('updateView', handleAnnotationChanged);
      documentViewer.addEventListener('updateAnnotationLayer', handleAnnotationChanged);
    } else {
      // If documentViewer isn't ready, try again after a delay
      documentViewerTimeoutId = setTimeout(() => {
        try {
          if (core && typeof core.getDocumentViewer === 'function') {
            const dv = core.getDocumentViewer();
            if (dv && typeof dv.addEventListener === 'function') {
              dv.addEventListener('zoomUpdated', handleAnnotationChanged);
              dv.addEventListener('updateView', handleAnnotationChanged);
              dv.addEventListener('updateAnnotationLayer', handleAnnotationChanged);
            }
          }
        } catch (e) {
          console.warn('LinkedEntityIndicatorContainer: Error adding delayed documentViewer listeners', e);
        }
      }, 500);
    }

    // Cleanup function
    return () => {
      if (coreListenersTimeoutId) {
        clearTimeout(coreListenersTimeoutId);
      }
      if (documentViewerTimeoutId) {
        clearTimeout(documentViewerTimeoutId);
      }

      try {
        if (coreListenersAdded && core && core.removeEventListener && typeof core.removeEventListener === 'function') {
          core.removeEventListener('annotationChanged', handleAnnotationChanged);
          core.removeEventListener('annotationAdded', handleAnnotationChanged);
          core.removeEventListener('annotationDeleted', handleAnnotationChanged);
        }
      } catch (e) {
        // Ignore cleanup errors
      }

      window.removeEventListener('message', handleMessage);

      try {
        const dv = documentViewer || (core && typeof core.getDocumentViewer === 'function' ? core.getDocumentViewer() : null);
        if (dv && typeof dv.removeEventListener === 'function') {
          dv.removeEventListener('zoomUpdated', handleAnnotationChanged);
          dv.removeEventListener('updateView', handleAnnotationChanged);
          dv.removeEventListener('updateAnnotationLayer', handleAnnotationChanged);
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    };
  }, [customizableUI, updateAnnotations]);

  // Debug logging
  useEffect(() => {
    if (customizableUI) {
      console.log('LinkedEntityIndicatorContainer: annotationsWithLinks', annotationsWithLinks.length);
      annotationsWithLinks.forEach((ann) => {
        const linkedEntities = ann.LinkedEntities || ann.linkedEntities;
        console.log('Annotation', ann.Id || ann.id, 'has', linkedEntities?.length || 0, 'linked entities');
      });
    }
  }, [annotationsWithLinks, customizableUI]);

  console.log('LinkedEntityIndicatorContainer: render check', { customizableUI, count: annotationsWithLinks.length });

  // Always render the container if customizableUI is enabled, even if empty (for debugging)
  if (!customizableUI) {
    console.log('LinkedEntityIndicatorContainer: Not rendering - customizableUI is false');
    return null;
  }

  console.log('LinkedEntityIndicatorContainer: Rendering container with', annotationsWithLinks.length, 'indicators');

  return (
    <div
      className="linked-entity-indicators-container"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10000,
        overflow: 'visible',
      }}
    >
      {annotationsWithLinks.length === 0 && (
        <div style={{ position: 'absolute', top: 10, left: 10, background: 'red', color: 'white', padding: '4px', zIndex: 10000 }}>
          DEBUG: No annotations with links found
        </div>
      )}
      {annotationsWithLinks.map((annotation) => (
        <LinkedEntityIndicator key={annotation.Id || annotation.id} annotation={annotation} />
      ))}
    </div>
  );
};

export default LinkedEntityIndicatorContainer;

