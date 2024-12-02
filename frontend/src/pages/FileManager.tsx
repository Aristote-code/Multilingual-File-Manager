import React, { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { api } from '../services/api';
import { useTranslation } from 'react-i18next';
import { ArrowDownTrayIcon, TrashIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';

interface File {
  _id: string;
  name: string;
  size: number;
  createdAt: string;
  url: string;
}

const FileManager = () => {
  const { t } = useTranslation();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: async (acceptedFiles) => {
      try {
        const formData = new FormData();
        acceptedFiles.forEach((file) => {
          formData.append('file', file);
        });

        await api.post('/files/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        fetchFiles();
      } catch (err) {
        setError('Upload failed');
      }
    },
  });

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/files/${id}`);
      setFiles(files.filter(file => file._id !== id));
    } catch (err) {
      setError('Delete failed');
    }
  };

  const fetchFiles = async () => {
    try {
      const response = await api.get('/files');
      setFiles(response.data);
    } catch (err) {
      setError('Failed to fetch files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-8 dark:text-white">{t('fileManager')}</h1>
      
      <div {...getRootProps()} className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 mb-8 text-center cursor-pointer bg-white dark:bg-gray-800">
        <input {...getInputProps()} />
        <div className="space-y-2">
          <div className="flex justify-center mb-4">
            <ArrowUpTrayIcon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-gray-900 dark:text-white font-medium">{t('dragAndDrop')}</p>
          <p className="text-gray-600 dark:text-gray-400">{t('uploadInstructions')}</p>
          <p className="text-gray-500 dark:text-gray-500 text-sm">{t('fileTypes')}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="grid grid-cols-4 gap-4 p-4 border-b border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400">
          <div>{t('name')}</div>
          <div>{t('size')}</div>
          <div>{t('date')}</div>
          <div className="text-right">{t('actions')}</div>
        </div>
        
        {files.map((file) => (
          <div key={file._id} className="grid grid-cols-4 gap-4 p-4 border-b border-gray-100 dark:border-gray-700 text-sm items-center hover:bg-gray-50 dark:hover:bg-gray-700">
            <div className="text-gray-900 dark:text-white">{file.name}</div>
            <div className="text-gray-600 dark:text-gray-400">{(file.size / 1024).toFixed(2)} KB</div>
            <div className="text-gray-600 dark:text-gray-400">
              {new Date(file.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => window.open(file.url)}
                className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                title={t('download')}
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleDelete(file._id)}
                className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                title={t('delete')}
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileManager;