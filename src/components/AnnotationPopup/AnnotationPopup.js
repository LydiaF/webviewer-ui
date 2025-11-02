import React, { useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import FocusTrap from 'components/FocusTrap';

import ActionButton from 'components/ActionButton';
import AnnotationStylePopup from 'components/AnnotationStylePopup';
import DatePicker from 'components/DatePicker';
import CustomizablePopup from 'components/CustomizablePopup';
import CalibrationPopup from 'components/CalibrationPopup';

import { getDataWithKey, mapToolNameToKey, mapAnnotationToKey } from 'constants/map';

import DataElements from 'constants/dataElement';

import './AnnotationPopup.scss';
import getRootNode from 'helpers/getRootNode';

// Component to display linked entities on annotations in popup
const LinkedEntitiesDisplayPopup = ({ annotation, customizableUI }) => {
  if (!customizableUI) return null;

  const annotationId = annotation?.Id || annotation?.id;
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'entityLinkedToAnnotation' && event.data?.annotationId === annotationId) {
        const newEntity = event.data?.entity;
        if (newEntity && annotation) {
          const currentEntities = Array.isArray(annotation.LinkedEntities)
            ? [...annotation.LinkedEntities]
            : Array.isArray(annotation.linkedEntities)
              ? [...annotation.linkedEntities]
              : [];

          const alreadyLinked = currentEntities.some((e) => e.edgeId === newEntity.edgeId || e.id === newEntity.id);
          if (!alreadyLinked) {
            const merged = [...currentEntities, newEntity];
            annotation.LinkedEntities = merged;
            annotation.linkedEntities = merged;
            setRefreshKey(prev => prev + 1);
          }
        }
      }

      if (event.data?.type === 'linkedEntitiesRefreshed' || event.data?.type === 'linkedEntitiesUpdated') {
        if (event.data?.entitiesByAnnotation && annotation && annotationId) {
          const entities = event.data.entitiesByAnnotation[annotationId];
          if (entities !== undefined) {
            annotation.LinkedEntities = Array.isArray(entities) ? [...entities] : [];
            annotation.linkedEntities = annotation.LinkedEntities;
            setRefreshKey(prev => prev + 1);
          } else if (event.data?.annotationId === annotationId) {
            setRefreshKey(prev => prev + 1);
          }
        } else {
          setTimeout(() => {
            setRefreshKey(prev => prev + 1);
          }, 50);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [annotationId, annotation]);

  const linkedEntities = annotation?.LinkedEntities || annotation?.linkedEntities || [];
  const entitiesArray = Array.isArray(linkedEntities) ? linkedEntities : [];

  if (entitiesArray.length === 0) {
    return null;
  }

  return (
    <div key={refreshKey} style={{
      paddingTop: '8px',
      paddingHorizontal: '2px',
      borderTop: '1px solid rgba(0, 0, 0, 0.1)',
      fontSize: '11px',
      width: '100%',
      display: 'block',
      clear: 'both',
    }}>
      <div style={{ fontWeight: '600', fontSize: '10px', textTransform: 'uppercase', color: '#6b7280', marginBottom: '4px' }}>
        Linked Entities
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '120px', overflowY: 'auto', width: '100%' }}>
        {entitiesArray.map((entity, index) => {
          let entityUrl = '';
          if (entity.type === 'event') {
            entityUrl = `/events/${entity.id}`;
          } else if (entity.type === 'node') {
            entityUrl = `/nodes/${entity.id}`;
          } else if (entity.type === 'issue') {
            entityUrl = `/lydia/${entity.id}`;
          }

          // Determine icon based on entity type
          let iconSvg = (
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="4" cy="4" r="3" fill="#3b82f6" />
            </svg>
          );

          if (entity.type === 'event') {
            iconSvg = (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" style={{ flexShrink: 0 }}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" strokeLinecap="round" />
              </svg>
            );
          } else if (entity.type === 'node') {
            iconSvg = (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v6m0 6v6M1 12h6m6 0h6" />
              </svg>
            );
          }

          return (
            <div key={`${entity.edgeId || entity.id || index}`} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 4px',
              fontSize: '11px',
            }}>
              {iconSvg}
              {entityUrl ? (
                <a
                  href={entityUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#3b82f6',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.textDecoration = 'none';
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  {entity.title || 'Untitled'}
                </a>
              ) : (
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entity.title || 'Untitled'}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

LinkedEntitiesDisplayPopup.propTypes = {
  annotation: PropTypes.object.isRequired,
  customizableUI: PropTypes.bool,
};

const propTypes = {
  isMobile: PropTypes.bool,
  isIE: PropTypes.bool,
  isOpen: PropTypes.bool,
  isRightClickMenu: PropTypes.bool,
  isNotesPanelOpenOrActive: PropTypes.bool,
  isRichTextPopupOpen: PropTypes.bool,
  isLinkModalOpen: PropTypes.bool,
  isWarningModalOpen: PropTypes.bool,
  isContextMenuPopupOpen: PropTypes.bool,
  isVisible: PropTypes.bool,

  focusedAnnotation: PropTypes.object,
  multipleAnnotationsSelected: PropTypes.bool,
  popupRef: PropTypes.any,
  position: PropTypes.object,

  showViewFileButton: PropTypes.bool,
  onViewFile: PropTypes.func,

  showCommentButton: PropTypes.bool,
  onCommentAnnotation: PropTypes.func,
  isDateFreeTextCanEdit: PropTypes.bool,
  isDatePickerOpen: PropTypes.bool,
  handleDateChange: PropTypes.func,
  onDatePickerShow: PropTypes.func,
  isCalibrationPopupOpen: PropTypes.bool,

  showEditStyleButton: PropTypes.bool,
  isStylePopupOpen: PropTypes.bool,
  hideSnapModeCheckbox: PropTypes.bool,
  openEditStylePopup: PropTypes.func,
  closeEditStylePopup: PropTypes.func,
  annotationStyle: PropTypes.object,
  onResize: PropTypes.func,

  showContentEditButton: PropTypes.bool,
  onEditContent: PropTypes.func,
  openContentEditDeleteWarningModal: PropTypes.func,

  isAppearanceSignature: PropTypes.bool,
  onClearAppearanceSignature: PropTypes.func,

  showRedactionButton: PropTypes.bool,
  onApplyRedaction: PropTypes.func,

  showGroupButton: PropTypes.bool,
  onGroupAnnotations: PropTypes.func,
  showUngroupButton: PropTypes.bool,
  onUngroupAnnotations: PropTypes.func,

  showFormFieldButton: PropTypes.bool,
  onOpenFormField: PropTypes.func,

  showDeleteButton: PropTypes.bool,
  onDeleteAnnotation: PropTypes.func,

  showLinkButton: PropTypes.bool,
  hasAssociatedLink: PropTypes.bool,
  linkAnnotationToURL: PropTypes.func,

  showFileDownloadButton: PropTypes.bool,
  downloadFileAttachment: PropTypes.func,

  showAudioPlayButton: PropTypes.bool,
  handlePlaySound: PropTypes.func,

  showCalibrateButton: PropTypes.bool,
  onOpenCalibration: PropTypes.func,

  customizableUI: PropTypes.bool,
  toggleStylePanel: PropTypes.func,
  isInReadOnlyMode: PropTypes.bool,
  onOpenAlignmentModal: PropTypes.func,
};

const AnnotationPopup = ({
  isMobile,
  isIE,
  isOpen,
  isRightClickMenu,
  isNotesPanelOpenOrActive,
  isRichTextPopupOpen,
  isLinkModalOpen,
  isWarningModalOpen,
  isContextMenuPopupOpen,
  isVisible,

  focusedAnnotation,
  popupRef,
  position,
  multipleAnnotationsSelected,

  showViewFileButton,
  onViewFile,

  showCommentButton,
  onCommentAnnotation,
  isDateFreeTextCanEdit,
  isDatePickerOpen,
  handleDateChange,
  onDatePickerShow,
  isCalibrationPopupOpen,

  showEditStyleButton,
  isStylePopupOpen,
  hideSnapModeCheckbox,
  openEditStylePopup,
  closeEditStylePopup,
  annotationStyle,
  onResize,

  showContentEditButton,
  onEditContent,
  openContentEditDeleteWarningModal,

  isAppearanceSignature,
  onClearAppearanceSignature,

  showRedactionButton,
  onApplyRedaction,

  showGroupButton,
  onGroupAnnotations,
  showUngroupButton,
  onUngroupAnnotations,

  showFormFieldButton,
  onOpenFormField,

  showDeleteButton,
  onDeleteAnnotation,

  showLinkButton,
  hasAssociatedLink,
  linkAnnotationToURL,

  showFileDownloadButton,
  downloadFileAttachment,

  showAudioPlayButton,
  handlePlaySound,

  showCalibrateButton,
  onOpenCalibration,

  customizableUI,
  toggleStylePanel,
  isInReadOnlyMode,
  onOpenAlignmentModal,
}) => {
  const [t] = useTranslation();
  const [shortCutKeysFor3DVisible, setShortCutKeysFor3DVisible] = useState(false);

  const commentButtonLabel = isDateFreeTextCanEdit ? 'action.changeDate' : 'action.comment';
  const commentButtonImg = isDateFreeTextCanEdit ? 'icon-tool-fill-and-sign-calendar' : 'icon-header-chat-line';
  const show3DShortCutButton = !isInReadOnlyMode && focusedAnnotation instanceof window.Core.Annotations.Model3DAnnotation && !isMobile;
  const isRectangle = focusedAnnotation instanceof window.Core.Annotations.RectangleAnnotation;
  const isEllipse = focusedAnnotation instanceof window.Core.Annotations.EllipseAnnotation;
  const isPolygon = focusedAnnotation instanceof window.Core.Annotations.PolygonAnnotation;
  const isFreeText =
    focusedAnnotation instanceof window.Core.Annotations.FreeTextAnnotation &&
    (focusedAnnotation.getIntent() === window.Core.Annotations.FreeTextAnnotation.Intent.FreeText ||
      focusedAnnotation.getIntent() === window.Core.Annotations.FreeTextAnnotation.Intent.FreeTextCallout);
  const isRedaction = focusedAnnotation instanceof window.Core.Annotations.RedactionAnnotation;
  const colorMapKey = mapAnnotationToKey(focusedAnnotation);
  const isMeasure = !!focusedAnnotation.Measure;
  const showLineStyleOptions = getDataWithKey(mapToolNameToKey(focusedAnnotation.ToolName)).hasLineEndings;
  const isInstanceActive = !window.isApryseWebViewerWebComponent || document.activeElement?.shadowRoot === getRootNode();
  let StrokeStyle = 'solid';
  const isContentEdit = focusedAnnotation.isContentEditPlaceholder?.();
  const isReadOnlySignature = focusedAnnotation instanceof window.Core.Annotations.SignatureWidgetAnnotation && focusedAnnotation.fieldFlags.get(window.Core.Annotations.WidgetFlags.READ_ONLY);
  const showClearSignatureButton = isAppearanceSignature && !showFormFieldButton;
  try {
    StrokeStyle = (focusedAnnotation['Style'] === 'dash')
      ? `${focusedAnnotation['Style']},${focusedAnnotation['Dashes']}`
      : focusedAnnotation['Style'];
  } catch (err) {
    console.error(err);
  }
  let properties = {};
  if (showLineStyleOptions) {
    properties = {
      StartLineStyle: focusedAnnotation.getStartStyle(),
      EndLineStyle: focusedAnnotation.getEndStyle(),
      StrokeStyle,
    };
  }

  if (isRectangle || isEllipse || isPolygon) {
    properties = {
      StrokeStyle,
    };
  }

  if (isFreeText) {
    const richTextStyles = focusedAnnotation.getRichTextStyle();
    const isAutoSizeFont = focusedAnnotation.isAutoSizeFont();
    const calculatedFontSize = focusedAnnotation.getCalculatedFontSize();

    properties = {
      Font: focusedAnnotation.Font,
      FontSize: focusedAnnotation.FontSize,
      TextAlign: focusedAnnotation.TextAlign,
      TextVerticalAlign: focusedAnnotation.TextVerticalAlign,
      bold: richTextStyles?.[0]?.['font-weight'] === 'bold' ?? false,
      italic: richTextStyles?.[0]?.['font-style'] === 'italic' ?? false,
      underline: richTextStyles?.[0]?.['text-decoration']?.includes('underline') || richTextStyles?.[0]?.['text-decoration']?.includes('word'),
      strikeout: richTextStyles?.[0]?.['text-decoration']?.includes('line-through') ?? false,
      StrokeStyle,
      isAutoSizeFont,
      calculatedFontSize,
    };
  }

  if (isRedaction) {
    properties = {
      OverlayText: focusedAnnotation['OverlayText'],
      Font: focusedAnnotation['Font'],
      FontSize: focusedAnnotation['FontSize'],
      TextAlign: focusedAnnotation['TextAlign']
    };
  }

  const renderPopup = () => {
    switch (true) {
      case isStylePopupOpen:
        return (
          <AnnotationStylePopup
            annotations={[focusedAnnotation]}
            style={annotationStyle}
            isOpen={isOpen}
            onResize={onResize}
            isFreeText={isFreeText}
            isEllipse={isEllipse}
            isRedaction={isRedaction}
            isMeasure={isMeasure}
            colorMapKey={colorMapKey}
            showLineStyleOptions={showLineStyleOptions}
            properties={properties}
            hideSnapModeCheckbox={hideSnapModeCheckbox}
            hasBackToMenu={isRightClickMenu}
            onBackToMenu={closeEditStylePopup}
          />
        );
      case isDatePickerOpen:
        return (
          <DatePicker onClick={handleDateChange} annotation={focusedAnnotation} onDatePickerShow={onDatePickerShow} />
        );
      case isCalibrationPopupOpen:
        return <CalibrationPopup annotation={focusedAnnotation} />;
      case shortCutKeysFor3DVisible && focusedAnnotation instanceof window.Core.Annotations.Model3DAnnotation:
        return (
          <div className="shortCuts3D">
            <div className="closeButton" onClick={() => setShortCutKeysFor3DVisible(false)}>x</div>
            <div className="row">{t('action.rotate3D')} <span>{t('shortcut.rotate3D')}</span></div>
            <div className="row">{t('action.zoom')} <span>{t('shortcut.zoom3D')}</span></div>
          </div>
        );
      default:
        return (
          <FocusTrap
            locked={isOpen && isInstanceActive && !isRichTextPopupOpen && !isNotesPanelOpenOrActive && !isLinkModalOpen && !isWarningModalOpen && !isFreeText && !isContextMenuPopupOpen}
          >
            <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'row' }}>
                <CustomizablePopup
                  dataElement={DataElements.ANNOTATION_POPUP}
                  childrenClassName='main-menu-button'
                >
                  {showViewFileButton && (
                    <ActionButton
                      className="main-menu-button"
                      dataElement="viewFileButton"
                      label={isRightClickMenu ? 'action.viewFile' : ''}
                      title={!isRightClickMenu ? 'action.viewFile' : ''}
                      img="icon-view"
                      onClick={onViewFile}
                    />
                  )}
                  {showCommentButton && (
                    <ActionButton
                      className="main-menu-button"
                      dataElement="annotationCommentButton"
                      label={isRightClickMenu ? commentButtonLabel : ''}
                      title={!isRightClickMenu ? commentButtonLabel : ''}
                      img={commentButtonImg}
                      onClick={onCommentAnnotation}
                    />
                  )}
                  {showEditStyleButton && (
                    <ActionButton
                      className="main-menu-button"
                      dataElement="annotationStyleEditButton"
                      label={isRightClickMenu ? 'action.style' : ''}
                      title={!isRightClickMenu ? 'action.style' : ''}
                      img="icon-menu-style-line"
                      onClick={customizableUI ? toggleStylePanel : openEditStylePopup}
                    />
                  )}
                  {showContentEditButton && (
                    <ActionButton
                      className="main-menu-button"
                      dataElement="annotationContentEditButton"
                      label={isRightClickMenu ? 'action.edit' : ''}
                      title={!isRightClickMenu ? 'action.edit' : ''}
                      img="ic_edit_page_24px"
                      onClick={onEditContent}
                    />
                  )}
                  {showClearSignatureButton && (
                    <ActionButton
                      className="main-menu-button"
                      dataElement="annotationClearSignatureButton"
                      label={!isReadOnlySignature && isRightClickMenu ? 'action.clearSignature' : ''}
                      title={isReadOnlySignature ? 'action.readOnlySignature' : (!isRightClickMenu ? 'action.clearSignature' : '')}
                      img={'icon-delete-line'}
                      onClick={onClearAppearanceSignature}
                      isNotClickableSelector={() => isReadOnlySignature}
                    />
                  )}
                  {showRedactionButton && (
                    <ActionButton
                      className="main-menu-button"
                      dataElement="annotationRedactButton"
                      label={isRightClickMenu ? 'action.apply' : ''}
                      title={!isRightClickMenu ? 'action.apply' : ''}
                      img="ic_check_black_24px"
                      onClick={onApplyRedaction}
                    />
                  )}
                  {showGroupButton && (
                    <ActionButton
                      className="main-menu-button"
                      dataElement="annotationGroupButton"
                      label={isRightClickMenu ? 'action.group' : ''}
                      title={!isRightClickMenu ? 'action.group' : ''}
                      img="group-annotations-icon"
                      onClick={onGroupAnnotations}
                    />
                  )}
                  {showUngroupButton && (
                    <ActionButton
                      className="main-menu-button"
                      dataElement="annotationUngroupButton"
                      label={isRightClickMenu ? 'action.ungroup' : ''}
                      title={!isRightClickMenu ? 'action.ungroup' : ''}
                      img="ungroup-annotations-icon"
                      onClick={onUngroupAnnotations}
                    />
                  )}
                  {multipleAnnotationsSelected && !isMobile && (
                    <ActionButton
                      className="main-menu-button"
                      dataElement='openAlignmentButton'
                      label={isRightClickMenu ? 'alignmentPopup.alignment' : ''}
                      title={!isRightClickMenu ? 'alignmentPopup.alignment' : ''}
                      img="ic-alignment-main"
                      onClick={onOpenAlignmentModal}
                    />
                  )}
                  {showFormFieldButton && (
                    <ActionButton
                      className="main-menu-button"
                      dataElement="formFieldEditButton"
                      label={isRightClickMenu ? 'action.formFieldEdit' : ''}
                      title={!isRightClickMenu ? 'action.formFieldEdit' : ''}
                      img="icon-edit-form-field"
                      onClick={onOpenFormField}
                    />
                  )}
                  {showDeleteButton && (
                    <ActionButton
                      className="main-menu-button"
                      dataElement="annotationDeleteButton"
                      label={isRightClickMenu ? 'action.delete' : ''}
                      title={!isRightClickMenu ? 'action.delete' : ''}
                      img="icon-delete-line"
                      onClick={isContentEdit ? openContentEditDeleteWarningModal : onDeleteAnnotation}
                    />
                  )}
                  {showCalibrateButton && (
                    <ActionButton
                      className="main-menu-button"
                      dataElement={DataElements.CALIBRATION_POPUP_BUTTON}
                      label={isRightClickMenu ? 'action.calibrate' : ''}
                      title={!isRightClickMenu ? 'action.calibrate' : ''}
                      img="calibrate"
                      onClick={onOpenCalibration}
                    />
                  )}
                  {showLinkButton && (
                    <ActionButton
                      className="main-menu-button"
                      dataElement="linkButton"
                      label={isRightClickMenu ? 'tool.Link' : ''}
                      title={!isRightClickMenu ? 'tool.Link' : ''}
                      img={hasAssociatedLink ? 'icon-tool-unlink' : 'icon-tool-link'}
                      onClick={linkAnnotationToURL}
                    />
                  )}
                  {showFileDownloadButton && (
                    <ActionButton
                      className="main-menu-button"
                      dataElement="fileAttachmentDownload"
                      label={isRightClickMenu ? 'action.fileAttachmentDownload' : ''}
                      title={!isRightClickMenu ? 'action.fileAttachmentDownload' : ''}
                      img="icon-download"
                      onClick={() => downloadFileAttachment(focusedAnnotation)}
                    />
                  )}
                  {show3DShortCutButton && (
                    <ActionButton
                      className="main-menu-button"
                      dataElement="shortCutKeysFor3D"
                      label={isRightClickMenu ? 'action.viewShortCutKeysFor3D' : ''}
                      title={!isRightClickMenu ? 'action.viewShortCutKeysFor3D' : ''}
                      img="icon-keyboard"
                      onClick={() => setShortCutKeysFor3DVisible(true)}
                    />
                  )}
                  {showAudioPlayButton && (
                    <ActionButton
                      className="main-menu-button"
                      dataElement="playSoundButton"
                      label={isRightClickMenu ? 'action.playAudio' : ''}
                      title={!isRightClickMenu ? 'action.playAudio' : ''}
                      img="ic_play_24px"
                      onClick={() => handlePlaySound(focusedAnnotation)}
                    />
                  )}
                </CustomizablePopup>
              </div>
              {focusedAnnotation && (
                <div style={{ width: '100%', flexShrink: 0, marginTop: '8px' }}>
                  <LinkedEntitiesDisplayPopup
                    annotation={focusedAnnotation}
                    customizableUI={customizableUI}
                  />
                </div>
              )}
            </div>
          </FocusTrap>
        );
    }
  };

  const annotationPopup = (
    <div
      className={classNames({
        Popup: true,
        AnnotationPopup: true,
        open: isOpen,
        closed: !isOpen,
        stylePopupOpen: isStylePopupOpen,
        'is-vertical': isRightClickMenu,
        'is-horizontal': !isRightClickMenu,
      })}
      ref={popupRef}
      data-element={DataElements.ANNOTATION_POPUP}
      style={{ ...position, visibility: isVisible || isVisible === undefined ? 'visible' : 'hidden' }}
    >
      {renderPopup()}
    </div>
  );

  return isIE || isMobile ? (
    annotationPopup
  ) : (
    <Draggable cancel=".Button, .cell, .sliders-container svg, select, button, input">{annotationPopup}</Draggable>
  );
};

AnnotationPopup.propTypes = propTypes;

export default AnnotationPopup;
