import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FileUpload } from '../components/FileUpload';
import { FileList } from '../components/FileList';
import { api } from '../services/api';

export default function FileManager() {
  const { t } = useTranslation();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/files');
      setFiles(response.data);
    } catch (error: any) {
      console.error('Error loading files:', error);
      setError(error.response?.data?.message || 'Error loading files');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setLoading(true);
      setError('');
      const formData = new FormData();
      formData.append('file', file);
      
      await api.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      await loadFiles(); // Reload the files list
    } catch (error: any) {
      console.error('Error uploading file:', error);
      setError(error.response?.data?.message || 'Error uploading file');
    } finally {
      setLoading(false);
    }
  };

  const handleFileDelete = async (fileId: string) => {
    try {
      setLoading(true);
      setError('');
      await api.delete(`/files/${fileId}`);
      await loadFiles();
    } catch (error: any) {
      console.error('Error deleting file:', error);
      setError(error.response?.data?.message || 'Error deleting file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">{t('fileManager.title')}</h1>
      
      {error && (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      <FileUpload onUpload={handleFileUpload} disabled={loading} />
      
      {loading ? (
        <div className="text-center py-4">
          <p className="text-gray-500">Loading...</p>
        </div>
      ) : (
        <FileList files={files} onDelete={handleFileDelete} />
      )}
    </div>
  );
}