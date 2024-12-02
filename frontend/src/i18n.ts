import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      rw: {
        translation: {
          fileManager: 'Gucunga Dosiye',
          uploadFile: 'Kanda kugira umuzamure',
          dragAndDrop: 'Kanda kugira umuzamure',
          uploadInstructions: 'cyangwa ukurure ureke',
          fileTypes: 'Ubwoko bwose bwa dosiye bwemewe',
          name: 'IZINA',
          size: 'INGANO',
          date: 'ITARIKI',
          actions: 'IBIKORWA',
          download: 'Kumanura',
          delete: 'Gusiba',
          login: 'Kwinjira',
          register: 'Kwiyandikisha',
          logout: 'Gusohoka',
          gusohoka: 'Gusohoka'
        }
      },
      en: {
        translation: {
          fileManager: 'File Manager',
          uploadFile: 'Upload File',
          dragAndDrop: 'Click to upload',
          uploadInstructions: 'or drag and drop',
          fileTypes: 'All file types are supported',
          name: 'NAME',
          size: 'SIZE',
          date: 'DATE',
          actions: 'ACTIONS',
          download: 'Download',
          delete: 'Delete',
          login: 'Login',
          register: 'Register',
          logout: 'Logout',
          invalidCredentials: 'Invalid username or password',
          loginFailed: 'Login failed. Please try again.',
          registrationFailed: 'Registration failed. Please try again.',
          passwordsDoNotMatch: 'Passwords do not match'
        }
      },
      fr: {
        translation: {
          fileManager: 'Gestionnaire de Fichiers',
          uploadFile: 'Télécharger',
          dragAndDrop: 'Cliquez pour télécharger',
          uploadInstructions: 'ou glisser-déposer',
          fileTypes: 'Tous les types de fichiers sont pris en charge',
          name: 'NOM',
          size: 'TAILLE',
          date: 'DATE',
          actions: 'ACTIONS',
          download: 'Télécharger',
          delete: 'Supprimer',
          login: 'Connexion',
          register: 'Inscription',
          logout: 'Déconnexion'
        }
      },
      es: {
        translation: {
          fileManager: 'Gestor de Archivos',
          uploadFile: 'Subir Archivo',
          dragAndDrop: 'Haga clic para cargar',
          uploadInstructions: 'o arrastrar y soltar',
          fileTypes: 'Se admiten todos los tipos de archivos',
          name: 'NOMBRE',
          size: 'TAMAÑO',
          date: 'FECHA',
          actions: 'ACCIONES',
          download: 'Descargar',
          delete: 'Eliminar',
          login: 'Iniciar Sesión',
          register: 'Registrarse',
          logout: 'Cerrar Sesión'
        }
      },
      sw: {
        translation: {
          fileManager: 'Kidhibiti Faili',
          uploadFile: 'Pakia Faili',
          dragAndDrop: 'Bofya kupakia',
          uploadInstructions: 'au buruta na uache',
          fileTypes: 'Aina zote za faili zinakubalika',
          name: 'JINA',
          size: 'UKUBWA',
          date: 'TAREHE',
          actions: 'VITENDO',
          download: 'Pakua',
          delete: 'Futa',
          login: 'Ingia',
          register: 'Jiandikishe',
          logout: 'Toka'
        }
      }
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n; 