import React, {
  useContext,
  useRef,
  useMemo,
  useCallback,
  useState,
} from 'react';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { RestClient } from 'api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from '@ovvio/styles/lib/components/dialog';
import { styleguide, layout } from '@ovvio/styles/lib';
import { CurrentUser } from 'stores/user';
import { AttachmentData } from '@ovvio/cfds/lib/base/scheme-types';
import { Logger } from '@ovvio/base';
import SpinnerView from '@ovvio/styles/lib/components/spinner-view';

const useStyles = makeStyles(() => ({
  input: {
    display: 'none',
  },
  content: {
    marginTop: styleguide.gridbase * 6,
    basedOn: [layout.column, layout.centerCenter],
  },
}));

interface CardFileUploader {
  upload: (
    workspace: string,
    user: CurrentUser,
    onFileSelected: (file: any) => void
  ) => Promise<AttachmentData>;
  download: (
    workspace: string,
    user: CurrentUser,
    fileInfo: AttachmentData
  ) => Promise<void>;
  delete: (
    workspace: string,
    user: CurrentUser,
    fileInfo: AttachmentData
  ) => Promise<void>;
}

const fileUploaderContext = React.createContext<CardFileUploader>(undefined);

interface UploadFileInfo {
  fileId: string;
  uploadTo: string;
}

interface DownloadFileInfo {
  fileId: string;
  url: string;
}

class FileUploader {
  async delete(
    workspace: string,
    user: CurrentUser,
    fileInfo: AttachmentData,
    signal?: any
  ) {
    const apiClient = new RestClient(user);

    try {
      await apiClient.delete(
        `/workspaces/${workspace}/uploads/${fileInfo.fileId}`,
        {
          signal,
        }
      );
    } catch (err) {
      if (err.statusCode !== undefined && err.statusCode === 404) {
        Logger.debug(
          `Deleting file: ${fileInfo.fileId} failed because it was not found`
        );
        return;
      }
      throw err;
    }
  }

  async upload(
    workspace: string,
    user: CurrentUser,
    file: any,
    signal?: any
  ): Promise<AttachmentData> {
    const apiClient = new RestClient(user);
    const extension = file.name.substring(file.name.lastIndexOf('.'));
    const uploadData = await apiClient.post<UploadFileInfo>(
      `/workspaces/${workspace}/uploads`,
      {
        contentType: file.type,
        extension,
      },
      { signal }
    );

    await fetch(uploadData.uploadTo, {
      method: 'PUT',
      body: file,
      signal,
    });

    return {
      filename: file.name,
      fileId: uploadData.fileId,
    };
  }

  async download(
    workspace: string,
    user: CurrentUser,
    fileInfo: AttachmentData,
    signal?: any
  ) {
    const apiClient = new RestClient(user);
    const downloadInfo = await apiClient.get<DownloadFileInfo>(
      `/workspaces/${workspace}/uploads/${fileInfo.fileId}`,
      {
        signal,
      }
    );

    const resp = await fetch(downloadInfo.url);
    const blob = await resp.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    // the filename you want
    a.download = fileInfo.filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  }
}

export function FileUploaderProvider({ children }) {
  const styles = useStyles();
  const input = useRef<any>();
  const [isUploading, setIsUploading] = useState(false);

  const getFile = useCallback(() => {
    return new Promise<any>((resolve, reject) => {
      if (!input.current) {
        return reject();
      }

      let promiseResolved = false;

      const handleFocusBack = () => {
        window.removeEventListener('focus', handleFocusBack);
        setTimeout(() => {
          input.current.removeEventListener('change', onChange);
          if (!promiseResolved) {
            promiseResolved = true;
            resolve(
              input.current.files.length > 0
                ? input.current.files[0]
                : undefined
            );
          }
        }, 500);
      };

      const onChange = () => {
        input.current.removeEventListener('change', onChange);
        window.removeEventListener('focus', handleFocusBack);

        promiseResolved = true;
        resolve(
          input.current.files.length > 0 ? input.current.files[0] : undefined
        );
      };

      const onClick = () => {
        window.addEventListener('focus', handleFocusBack);
        input.current.removeEventListener('click', onClick);
      };

      input.current.addEventListener('change', onChange);
      input.current.addEventListener('click', onClick);
      input.current.click();
    });
  }, []);

  const uploader = useMemo<CardFileUploader>(
    () => ({
      upload: async (
        workspace: string,
        user: CurrentUser,
        onFileSelected: (data: AttachmentData) => void,
        signal?: any
      ) => {
        try {
          const file = await getFile();
          if (!file) {
            return;
          }
          onFileSelected(file);
          const fileUploader = new FileUploader();

          return await fileUploader.upload(workspace, user, file, signal);
        } finally {
          setIsUploading(false);
        }
      },
      download: async (
        workspace: string,
        user: CurrentUser,
        fileInfo: AttachmentData
      ) => {
        return await new FileUploader().download(workspace, user, fileInfo);
      },
      delete: async (
        workspace: string,
        user: CurrentUser,
        fileInfo: AttachmentData
      ) => {
        return await new FileUploader().delete(workspace, user, fileInfo);
      },
    }),
    [getFile]
  );

  return (
    <fileUploaderContext.Provider value={uploader}>
      {children}
      <Dialog open={isUploading}>
        <DialogHeader>Uploading...</DialogHeader>
        <DialogContent className={cn(styles.content)}>
          <SpinnerView />
        </DialogContent>
      </Dialog>
      <input type="file" className={cn(styles.input)} ref={input} />
    </fileUploaderContext.Provider>
  );
}

export function useFileUploader() {
  return useContext(fileUploaderContext);
}
