import React, { useEffect, useLayoutEffect, useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useSelector, useDispatch } from 'react-redux';
import actions from 'actions';
import core from 'core';
import selectors from 'selectors';
import { getAnnotationPosition } from 'helpers/getPopupPosition';
import DataElements from 'constants/dataElement';
import './LinkedEntityIndicator.scss';

const propTypes = {
  annotation: PropTypes.object.isRequired,
};

const LinkedEntityIndicator = ({ annotation }) => {
  const annotationId = annotation?.Id || annotation?.id;
  const [position, setPosition] = useState({ x: -9999, y: -9999, visible: false });
  const indicatorRef = useRef(null);
  const refreshKeyRef = useRef(0);

  const customizableUI = useSelector((state) => selectors.getFeatureFlags(state)?.customizableUI);
  const dispatch = useDispatch();

  // Get panel widths and states to adjust position
  const leftPanelWidth = useSelector((state) => selectors.getLeftPanelWidth(state));
  const notesPanelWidth = useSelector((state) => selectors.getNotesPanelWidth(state));
  const searchPanelWidth = useSelector((state) => selectors.getSearchPanelWidth(state));
  const isLeftPanelOpen = useSelector((state) => selectors.isElementOpen(state, DataElements.LEFT_PANEL));
  const isNotesPanelOpen = useSelector((state) => selectors.isElementOpen(state, DataElements.NOTES_PANEL));
  const isSearchPanelOpen = useSelector((state) => selectors.isElementOpen(state, DataElements.SEARCH_PANEL));

  console.log('LinkedEntityIndicator: rendered for annotation', annotationId, 'customizableUI:', customizableUI);

  // Only show in customizable UI mode
  if (!customizableUI) {
    console.log('LinkedEntityIndicator: Not rendering - customizableUI is false');
    return null;
  }

  const updatePosition = useCallback(() => {
    try {
      const linkedEntities = annotation?.LinkedEntities || annotation?.linkedEntities || [];
      if (!Array.isArray(linkedEntities) || linkedEntities.length === 0) {
        setPosition({ x: -9999, y: -9999, visible: false });
        return;
      }

      // Get annotation position using helper function
      const { topLeft, bottomRight } = getAnnotationPosition(annotation);

      if (!topLeft || !bottomRight) {
        console.log('LinkedEntityIndicator: No position for annotation', annotationId);
        setPosition({ x: -9999, y: -9999, visible: false });
        return;
      }

      // Get scroll offsets
      const scrollViewElement = core.getScrollViewElement();
      const scrollLeft = scrollViewElement?.scrollLeft || 0;
      const scrollTop = scrollViewElement?.scrollTop || 0;

      // Get the measurement container (our positioning parent)
      const containerParent = scrollViewElement?.closest('.measurement-container');
      if (!containerParent) {
        console.log('LinkedEntityIndicator: No measurement-container found');
        setPosition({ x: -9999, y: -9999, visible: false });
        return;
      }

      const containerParentRect = containerParent.getBoundingClientRect();
      const scrollViewRect = scrollViewElement?.getBoundingClientRect();

      // Convert window coordinates to container-relative coordinates
      // getAnnotationPosition returns window coordinates, we need container coordinates
      const containerOffsetX = scrollViewRect ? scrollViewRect.left - containerParentRect.left : 0;
      const containerOffsetY = scrollViewRect ? scrollViewRect.top - containerParentRect.top : 0;

      const marginOffset = 12; // pixels from annotation edge

      // Position indicator to the right of the annotation, vertically centered
      // Convert window coordinates to container-relative by subtracting container offset and adding scroll
      const x = bottomRight.x - containerOffsetX + scrollLeft + marginOffset;
      const y = topLeft.y + (bottomRight.y - topLeft.y) / 2 - containerOffsetY + scrollTop;

      console.log('LinkedEntityIndicator: Setting position', { x, y, count: linkedEntities.length, topLeft, bottomRight, scrollLeft, scrollTop });
      setPosition({ x, y, visible: true, count: linkedEntities.length });
    } catch (error) {
      console.error('Error updating linked entity indicator position:', error);
      setPosition({ x: -9999, y: -9999, visible: false });
    }
  }, [annotation, annotationId]);

  // Listen for annotation changes and linked entities updates
  useEffect(() => {
    const handleMessage = (event) => {
      // Check if this message is for this specific annotation
      const messageAnnotationId = event.data?.annotationId;
      const isRelevant =
        !messageAnnotationId || // Global update message
        messageAnnotationId === annotationId; // Message for this specific annotation

      if (
        isRelevant &&
        (event.data?.type === 'linkedEntitiesRefreshed' ||
          event.data?.type === 'linkedEntitiesUpdated' ||
          event.data?.type === 'entityLinkedToAnnotation' ||
          event.data?.type === 'unlinkEntityFromAnnotation')
      ) {
        // Update immediately and also after a delay to catch any async updates
        refreshKeyRef.current += 1;
        updatePosition();
        setTimeout(() => {
          refreshKeyRef.current += 1;
          updatePosition();
        }, 150);
      }
    };

    // Update position initially and on annotation changes
    updatePosition();

    // Listen for annotation changes (moved, resized, etc)
    const handleAnnotationChanged = (annotations, action) => {
      if (action === 'modify' || action === 'add') {
        annotations.forEach((ann) => {
          if ((ann.Id || ann.id) === annotationId) {
            // Also check if linked entities changed
            refreshKeyRef.current += 1;
            updatePosition();
          }
        });
      }
    };

    core.addEventListener('annotationChanged', handleAnnotationChanged);
    window.addEventListener('message', handleMessage);

    // Update on zoom/scroll/view changes
    const documentViewer = core.getDocumentViewer();
    const handleUpdateView = () => {
      setTimeout(() => updatePosition(), 100);
    };

    const handleScroll = () => {
      updatePosition();
    };

    documentViewer?.addEventListener('zoomUpdated', handleUpdateView);
    documentViewer?.addEventListener('updateView', handleUpdateView);
    documentViewer?.addEventListener('updateAnnotationLayer', handleUpdateView);

    // Listen to scroll events on the scroll view element
    const scrollViewElement = core.getScrollViewElement();
    scrollViewElement?.addEventListener('scroll', handleScroll);

    // Listen for panel open/close events to update position
    const store = core.getStore?.();
    if (store) {
      const unsubscribe = store.subscribe(() => {
        // Update position when panels open/close
        setTimeout(() => updatePosition(), 100);
      });

      return () => {
        unsubscribe?.();
        core.removeEventListener('annotationChanged', handleAnnotationChanged);
        window.removeEventListener('message', handleMessage);
        documentViewer?.removeEventListener('zoomUpdated', handleUpdateView);
        documentViewer?.removeEventListener('updateView', handleUpdateView);
        documentViewer?.removeEventListener('updateAnnotationLayer', handleUpdateView);
        scrollViewElement?.removeEventListener('scroll', handleScroll);
      };
    }

    return () => {
      core.removeEventListener('annotationChanged', handleAnnotationChanged);
      window.removeEventListener('message', handleMessage);
      documentViewer?.removeEventListener('zoomUpdated', handleUpdateView);
      documentViewer?.removeEventListener('updateView', handleUpdateView);
      documentViewer?.removeEventListener('updateAnnotationLayer', handleUpdateView);
      scrollViewElement?.removeEventListener('scroll', handleScroll);
    };
  }, [annotationId, annotation, leftPanelWidth, isLeftPanelOpen, notesPanelWidth, isNotesPanelOpen, searchPanelWidth, isSearchPanelOpen, customizableUI]);

  // Recalculate position when panel states change
  useEffect(() => {
    if (customizableUI) {
      // Small delay to allow panel animation to complete
      const timeoutId = setTimeout(() => {
        updatePosition();
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [leftPanelWidth, isLeftPanelOpen, notesPanelWidth, isNotesPanelOpen, searchPanelWidth, isSearchPanelOpen, customizableUI, annotation]);

  const linkedEntities = annotation?.LinkedEntities || annotation?.linkedEntities || [];
  const count = Array.isArray(linkedEntities) ? linkedEntities.length : 0;

  // Handle entity click - send message to parent to navigate
  const handleEntityClick = (entity) => {
    window.parent.postMessage({
      type: 'navigateToEntity',
      entityId: entity.id,
      entityType: entity.type,
    }, '*');
  };



  if (!position.visible || count === 0) {
    if (count > 0) {
      console.log('LinkedEntityIndicator: Not visible but has count - position:', position);
      // Render a debug indicator even if position is off-screen
      return (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: 'orange',
            color: 'white',
            padding: '4px',
            zIndex: 10000,
            fontSize: '12px',
          }}
        >
          DEBUG: Indicator for {annotationId} - count: {count}, pos: {position.x}, {position.y}
        </div>
      );
    }
    return null;
  }

  console.log('LinkedEntityIndicator: Rendering at position', position.x, position.y, 'count:', count);

  return (
    <div
      ref={indicatorRef}
      className="LinkedEntityIndicator"
      key={refreshKeyRef.current}
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translateY(-50%)',
        pointerEvents: 'auto',
        zIndex: 10001,
      }}
      onClick={(e) => {
        e.stopPropagation();
        console.log('LinkedEntityIndicator: onClick - selecting annotation:', annotationId, 'count:', count);

        // Select the annotation (same as clicking on the highlight)
        // First deselect all, then select this one to match normal selection behavior
        core.deselectAllAnnotations();
        core.selectAnnotation(annotation);
      }}
    >
      <div
        className="linked-entity-badge"
        style={{ pointerEvents: 'auto' }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ pointerEvents: 'none' }}>
          <circle cx="10" cy="10" r="9" fill="#3b82f6" stroke="white" strokeWidth="2" />
          <path
            d="M7 10L9 12L13 8"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {count > 1 && (
        <div className="linked-entity-count">{count}</div>
      )}
    </div>
  );
};

LinkedEntityIndicator.propTypes = propTypes;

export default LinkedEntityIndicator;

