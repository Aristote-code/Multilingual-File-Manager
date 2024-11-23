import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FileUpload } from '../components/FileUpload';
import { FileList } from '../components/FileList';
import { api } from '../services/api';

export default function FileManager() {
  const { t } = useTranslation();
  const [files, setFiles] = useState([]);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const response = await api.get('/files');
      setFiles(response.data);
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post('/files/upload', formData);
      loadFiles();
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const handleFileDelete = async (fileId: string) => {
    try {
      await api.delete(`/files/${fileId}`);
      loadFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t('fileManager.title')}</h1>
      <FileUpload onUpload={handleFileUpload} />
      <FileList files={files} onDelete={handleFileDelete} />
    </div>
  );
}