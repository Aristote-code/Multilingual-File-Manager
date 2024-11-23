import { useTranslation } from 'react-i18next';
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline';

interface FileUploadProps {
  onUpload: (file: File) => void;
  disabled?: boolean;
}

export function FileUpload({ onUpload, disabled }: FileUploadProps) {
  const { t } = useTranslation();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUpload(file);
      // Reset the input
      event.target.value = '';
    }
  };

  return (
    <div className="flex items-center justify-center w-full">
      <label className={`flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
      }`}>
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <ArrowUpTrayIcon className="w-10 h-10 mb-3 text-gray-400" />
          <p className="mb-2 text-sm text-gray-500">
            <span className="font-semibold">
              {disabled ? t('fileUpload.uploading') : t('fileUpload.clickToUpload')}
            </span>
          </p>
          <p className="text-xs text-gray-500">{t('fileUpload.dragDrop')}</p>
          <p className="text-xs text-gray-500">{t('fileUpload.supportedFormats')}</p>
        </div>
        <input
          type="file"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled}
        />
      </label>
    </div>
  );
}