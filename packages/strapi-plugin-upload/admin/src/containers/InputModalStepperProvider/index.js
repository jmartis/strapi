import React, { useReducer, useEffect } from 'react';
import PropTypes from 'prop-types';
import { request, generateSearchFromFilters } from 'strapi-helper-plugin';
import { get } from 'lodash';
import pluginId from '../../pluginId';
import { getRequestUrl, compactParams } from '../../utils';
import InputModalStepperContext from '../../contexts/InputModal/InputModalDataManager';
import init from './init';
import reducer, { initialState } from './reducer';

const InputModalStepperProvider = ({
  isOpen,
  multiple,
  children,
  onInputMediaChange,
  selectedFiles,
}) => {
  const [reducerState, dispatch] = useReducer(reducer, initialState, state =>
    init({
      ...state,
      selectedFiles: Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles],
    })
  );
  const { params, filesToUpload } = reducerState;

  useEffect(() => {
    if (isOpen) {
      fetchMediaLib();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, params]);

  const handleRemoveFileToUpload = fileIndex => {
    dispatch({
      type: 'REMOVE_FILE_TO_UPLOAD',
      fileIndex,
    });
  };

  const handleFileToEditChange = ({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE',
      keys: name,
      value,
    });
  };

  const handleMoveAsset = (dragIndex, hoverIndex) => {
    dispatch({
      type: 'MOVE_ASSET',
      dragIndex,
      hoverIndex,
    });
  };

  const handleResetFileToEdit = () => {
    dispatch({
      type: 'RESET_FILE_TO_EDIT',
    });
  };

  const removeFilter = index => {
    dispatch({
      type: 'REMOVE_FILTER',
      filterToRemove: index,
    });
  };

  const handleClose = () => {
    dispatch({
      type: 'RESET_PROPS',
    });
  };

  const handleFileSelection = ({ target: { name, value } }) => {
    dispatch({
      type: 'ON_FILE_SELECTION',
      id: parseInt(name, 10),
      value,
    });
  };

  const handleAllFilesSelection = () => {
    dispatch({
      type: 'TOGGLE_SELECT_ALL',
    });
  };

  const setParam = param => {
    dispatch({
      type: 'SET_PARAM',
      param,
    });
  };

  const goTo = to => {
    dispatch({
      type: 'GO_TO',
      to,
    });
  };

  const handleGoToEditNewFile = fileIndex => {
    dispatch({
      type: 'SET_FILE_TO_EDIT',
      fileIndex,
    });

    goTo('edit-new');
  };

  const handleCleanFilesError = () => {
    dispatch({
      type: 'CLEAN_FILES_ERROR',
    });
  };

  const handleSetCropResult = blob => {
    dispatch({
      type: 'SET_CROP_RESULT',
      blob,
    });
  };

  const handleCancelFileToUpload = fileIndex => {
    const fileToCancel = get(filesToUpload, fileIndex, {});

    // Cancel upload
    fileToCancel.abortController.abort();

    handleRemoveFileToUpload(fileIndex);
  };

  const fetchMediaLibFilesCount = async () => {
    const requestURL = getRequestUrl('files/count');

    try {
      return await request(`${requestURL}`, {
        method: 'GET',
      });
    } catch (err) {
      strapi.notification.error('notification.error');

      return err;
    }
  };

  const fetchMediaLib = async () => {
    const [files, count] = await Promise.all([fetchMediaLibFiles(), fetchMediaLibFilesCount()]);
    dispatch({
      type: 'GET_DATA_SUCCEEDED',
      files,
      countData: count,
    });
  };

  const fetchMediaLibFiles = async () => {
    const requestURL = getRequestUrl('files');

    const compactedParams = compactParams(params);
    const paramsToSend = generateSearchFromFilters(compactedParams);

    try {
      return await request(`${requestURL}?${paramsToSend}`, {
        method: 'GET',
      });
    } catch (err) {
      strapi.notification.error('notification.error');

      return err;
    }
  };

  const addFilesToUpload = ({ target: { value } }) => {
    dispatch({
      type: 'ADD_FILES_TO_UPLOAD',
      filesToUpload: value,
    });
  };

  const handleUploadFiles = async () => {
    dispatch({
      type: 'SET_FILES_UPLOADING_STATE',
    });

    const requests = filesToUpload.map(
      async ({ file, fileInfo, originalIndex, abortController }) => {
        const formData = new FormData();
        const headers = {};
        formData.append('files', file);
        formData.append('fileInfo', JSON.stringify(fileInfo));

        try {
          const data = await request(
            `/${pluginId}`,
            {
              method: 'POST',
              headers,
              body: formData,
              signal: abortController.signal,
            },
            false,
            false
          );

          dispatch({
            type: 'REMOVE_FILE_TO_UPLOAD',
            fileIndex: originalIndex,
            addToSelectedFiles: data,
            multiple,
          });
        } catch (err) {
          const errorMessage = get(
            err,
            ['response', 'payload', 'message', '0', 'messages', '0', 'message'],
            null
          );

          dispatch({
            type: 'SET_FILE_ERROR',
            fileIndex: originalIndex,
            errorMessage,
          });
        }
      }
    );

    await Promise.all(requests);
  };

  return (
    <InputModalStepperContext.Provider
      value={{
        ...reducerState,
        addFilesToUpload,
        fetchMediaLib,
        goTo,
        handleAllFilesSelection,
        handleCancelFileToUpload,
        handleCleanFilesError,
        handleClose,
        handleFileSelection,
        handleFileToEditChange,
        handleGoToEditNewFile,
        handleRemoveFileToUpload,
        handleResetFileToEdit,
        handleSetCropResult,
        handleUploadFiles,
        moveAsset: handleMoveAsset,
        multiple,
        onInputMediaChange,
        removeFilter,
        setParam,
      }}
    >
      {children}
    </InputModalStepperContext.Provider>
  );
};

InputModalStepperProvider.propTypes = {
  children: PropTypes.node.isRequired,
  isOpen: PropTypes.bool,
  multiple: PropTypes.bool.isRequired,
  onInputMediaChange: PropTypes.func,
  selectedFiles: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

InputModalStepperProvider.defaultProps = {
  isOpen: false,
  onInputMediaChange: () => {},
  selectedFiles: null,
};

export default InputModalStepperProvider;