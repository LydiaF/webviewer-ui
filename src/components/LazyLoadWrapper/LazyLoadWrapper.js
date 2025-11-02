import React, { Suspense, useEffect } from 'react';
import { useSelector } from 'react-redux';
import selectors from 'selectors';
import DataElements from 'constants/dataElement';
import { isOfficeEditorMode, shouldBeDisabledInOfficeEditor } from 'helpers/officeEditor';

// Map that tracks if the element has been opened before
const openedElementsMap = new Map();
// Elements in this list will stay in the DOM after opened for the first time
// So the status of these elements will not be discarded when closed
const elementsList = [DataElements.SEARCH_PANEL, DataElements.LINKED_ENTITY_INDICATOR_CONTAINER];
elementsList.forEach((dataElement) => {
  openedElementsMap.set(dataElement, false);
});
const elementWasOpened = (dataElement) => openedElementsMap.has(dataElement) && openedElementsMap.get(dataElement);

const LazyLoadWrapper = ({
  Component,
  dataElement,
  onOpenHook = () => { },
  ...passedInProps
}) => {
  const onOpenProps = onOpenHook();
  const isOpen = useSelector((state) => selectors.isElementOpen(state, dataElement));
  const isDisabled = useSelector((state) => selectors.isElementDisabled(state, dataElement));

  useEffect(() => {
    if (isOpen && openedElementsMap.has(dataElement) && !openedElementsMap.get(dataElement)) {
      openedElementsMap.set(dataElement, true);
    }
  }, [isOpen]);

  // Special handling for linkedEntityIndicatorContainer - always render if in elementsList
  // This ensures badges are always visible when customizableUI is enabled
  const isLinkedEntityContainer = dataElement === DataElements.LINKED_ENTITY_INDICATOR_CONTAINER;
  const shouldAlwaysRender = isLinkedEntityContainer && openedElementsMap.has(dataElement);

  // Debug logging for linkedEntityIndicatorContainer
  if (isLinkedEntityContainer) {
    console.log('LazyLoadWrapper: linkedEntityIndicatorContainer', {
      isDisabled,
      isOpen,
      elementWasOpened: elementWasOpened(dataElement),
      shouldAlwaysRender,
      shouldRender: shouldAlwaysRender || !(isDisabled || !(isOpen || elementWasOpened(dataElement)) || (isOfficeEditorMode() && shouldBeDisabledInOfficeEditor(dataElement))),
    });
  }

  // For linkedEntityIndicatorContainer, mark as opened immediately if it's in the list
  useEffect(() => {
    if (isLinkedEntityContainer && openedElementsMap.has(dataElement) && !openedElementsMap.get(dataElement)) {
      openedElementsMap.set(dataElement, true);
    }
  }, [isLinkedEntityContainer, dataElement]);

  if (shouldAlwaysRender && !isDisabled && !(isOfficeEditorMode() && shouldBeDisabledInOfficeEditor(dataElement))) {
    return (
      <Suspense fallback={<></>}>
        <Component
          dataElement={dataElement}
          {...onOpenProps}
          {...passedInProps}
        />
      </Suspense>
    );
  }

  return (isDisabled || !(isOpen || elementWasOpened(dataElement)) || (isOfficeEditorMode() && shouldBeDisabledInOfficeEditor(dataElement))) ? null : (
    <Suspense fallback={<></>}>
      <Component
        dataElement={dataElement}
        {...onOpenProps}
        {...passedInProps}
      />
    </Suspense>
  );
};

export default LazyLoadWrapper;
