import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileAudio, Download, CheckCircle, Clock, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useChannel} from 'ably/react';


// Définissez la structure des messages envoyés par votre workflow
interface WorkflowMessage {
  step: string;
  status: 'active' | 'completed' | 'error';
  data?: any;
}
interface FormData {
  documentType: string;
  meetingTitle: string;
  meetingDate: string;
  mainObjective: string;
  participants: string;
  audioFile: File | null;
  language: string;
  ordreJour: string;
}

interface FormErrors {
  documentType?: string;
  meetingTitle?: string;
  meetingDate?: string;
  mainObjective?: string;
  audioFile?: string;
  language?: string;
  ordreJour?: string;
}

interface WorkflowStep {
  id: string;
  status: 'active' | 'completed' | 'error' | 'pending';
  data?: any;
  label: string;
}

 

const MeetingWorkflowApp: React.FC = () => {
  
  
  // État pour stocker les messages reçus
  const [receivedText, setReceivedText] = useState<string>('');
const [messages, setMessages] = useState<WorkflowMessage[]>([]);
const [currentStep, setCurrentStep] = useState<string>('');
const { channel } = useChannel('echo');

// Définir les étapes du workflow - CORRECTION : Variable manquante
const steps = ['upload', 'transcription', 'processing', 'generation', 'completion'];

// Écoutez les messages du canal Ably
useEffect(() => {
  
  // S'abonner au canal pour écouter les messages
  channel.subscribe('result', (message) => {
    const data = message.data as WorkflowMessage;
    console.log('Message reçu:', data);
    // Ajouter le message à l'état
    setMessages((prevMessages) => [...prevMessages, data]);
  
    // Traiter le message selon son statut
    switch (data.status) {
      case 'active':
        setCurrentStep(data.step);
        updateWorkflowStep(data.step, 'active');
        break;
        
      case 'completed':
        simulateWorkflow(data.step);
        break;
        
      case 'error':
        updateWorkflowStep(data.step, 'error');
        console.error(`Erreur dans l'étape ${data.step}:`, data.data);
        break;
        
      default:
        console.warn('Statut de message non reconnu:', data.status);
    }
    
    // Si le message contient des données spécifiques (comme un lien de téléchargement)

    if (typeof data === 'string') {
       simulateWorkflow('completion')
      setReceivedText(data);
    }

  });

  // Nettoyer l'abonnement lors du démontage du composant
  return () => {
    channel.unsubscribe('result');
  };
}, [channel]);

const [formData, setFormData] = useState<FormData>({
  documentType: '',
  meetingTitle: '',
  meetingDate: '',
  mainObjective: '',
  participants: '',
  audioFile: null,
  language: 'fr',
  ordreJour: ''
});

const [formErrors, setFormErrors] = useState<FormErrors>({});

const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([
  { id: 'upload', label: 'Téléchargement du fichier', status: 'pending' },
  { id: 'transcription', label: 'Transcription avec Whisper', status: 'pending' },
  { id: 'processing', label: 'Traitement par OpenAI', status: 'pending' },
  { id: 'generation', label: 'Génération du document', status: 'pending' },
  { id: 'completion', label: 'Finalisation', status: 'pending' }
]);

const [isProcessing, setIsProcessing] = useState(false);
const [format, setformat] = useState("");
const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
// Ajoutez ces états à votre composant
const [isDownloadReady, setIsDownloadReady] = useState(false);

const fileInputRef = useRef<HTMLInputElement>(null);

const handleInputChange = (field: keyof FormData, value: string) => {
  setFormData(prev => ({ ...prev, [field]: value }));
  
  // Effacer l'erreur du champ quand l'utilisateur commence à le remplir
  if (formErrors[field as keyof FormErrors]) {
    setFormErrors(prev => ({ ...prev, [field]: undefined }));
  }
};

const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0] || null;
  setFormData(prev => ({ ...prev, audioFile: file }));
  
  // Effacer l'erreur du fichier audio quand un fichier est sélectionné
  if (file && formErrors.audioFile) {
    setFormErrors(prev => ({ ...prev, audioFile: undefined }));
  }
};

const validateForm = (): boolean => {
  const errors: FormErrors = {};
  
  if (!formData.documentType) {
    errors.documentType = 'Veuillez sélectionner un type de document';
  }
  
  if (!formData.meetingTitle.trim()) {
    errors.meetingTitle = 'Le titre de la réunion est obligatoire';
  }
  
  if (!formData.meetingDate) {
    errors.meetingDate = 'La date de la réunion est obligatoire';
  }
  
  if (!formData.mainObjective.trim()) {
    errors.mainObjective = 'L\'objectif principal est obligatoire';
  }
  
  if (!formData.audioFile) {
    errors.audioFile = 'Le fichier audio est obligatoire';
  }
  
  if (!formData.language) {
    errors.language = 'La langue est obligatoire';
  }
  
  if (!formData.ordreJour) {
    errors.ordreJour = 'l\'ordre du jour est obligatoire';
  }
  
  setFormErrors(errors);
  return Object.keys(errors).length === 0;
};

const updateWorkflowStep = (stepId: string, status: WorkflowStep['status']) => {
  setWorkflowSteps(prev => 
    prev.map(step => 
      step.id === stepId ? { ...step, status } : step
    )
  );
};

// CORRECTION : Fonction simulateWorkflow corrigée
const simulateWorkflow = (completedStep: string) => {
  // Marquer l'étape actuelle comme complétée
  updateWorkflowStep(completedStep, 'completed');
  
  // Trouver l'index de l'étape complétée
  const currentIndex = steps.indexOf(completedStep);
  
  // Si ce n'est pas la dernière étape, activer la suivante
  if (currentIndex < steps.length - 1) {
    const nextStep = steps[currentIndex + 1];
    setCurrentStep(nextStep);
    updateWorkflowStep(nextStep, 'active');
  } else {
    // Workflow terminé
    console.log('Workflow terminé');
    setIsProcessing(false); // CORRECTION : Arrêter le processing
    // Simuler la génération d'un lien de téléchargement
    setDownloadUrl('#download-ready');
  }
};

const handleSubmit = async () => {
  
  if (!validateForm()) {
    return;
  }

  setIsProcessing(true);
  
  // CORRECTION : Réinitialiser les étapes au début
  setWorkflowSteps(prev => 
    prev.map(step => ({ ...step, status: 'pending' }))
  );
  
  try {
    // Préparation des données pour l'envoi
    const formDataToSend = new FormData();
    formDataToSend.append('documentType', formData.documentType);
    formDataToSend.append('meetingTitle', formData.meetingTitle);
    formDataToSend.append('meetingDate', formData.meetingDate);
    formDataToSend.append('mainObjective', formData.mainObjective);
    formDataToSend.append('participants', formData.participants);
    if (formData.audioFile) {
      formDataToSend.append('audioFile', formData.audioFile);
    }
    formDataToSend.append('language', formData.language);
    formDataToSend.append('ordreJour', formData.ordreJour);

    // Appel API avec Axios
    const response = await axios.post('http://localhost:5678/webhook-test/upload-audio', formDataToSend, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        // Optionnel: gérer la progression de l'upload
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || 1)
        );
        console.log(`Upload Progress: ${percentCompleted}%`);
      },
    });
    
    console.log('Réponse du serveur:', response.data);
    
  } catch (error) {
    console.error('Erreur lors du traitement:', error);
    
    // CORRECTION : Arrêter le processing en cas d'erreur
    setIsProcessing(false);
    
    // Gérer différents types d'erreurs
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Erreur de réponse du serveur
        console.error('Erreur serveur:', error.response.status, error.response.data);
        alert(`Erreur serveur: ${error.response.status}`);
      } else if (error.request) {
        // Erreur de réseau
        console.error('Erreur réseau:', error.request);
        alert('Erreur de connexion. Vérifiez votre connexion internet.');
      } else {
        // Autre erreur
        console.error('Erreur:', error.message);
        alert('Une erreur inattendue s\'est produite.');
      }
    }
  }
  // CORRECTION : Supprimer le finally qui arrêtait toujours le processing
  // Le processing sera arrêté par Ably ou en cas d'erreur
};

const getStepIcon = (step: WorkflowStep) => {
  switch (step.status) {
    case 'completed':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'active':
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    case 'error':
      return <div className="w-5 h-5 rounded-full bg-red-500" />;
    default:
      return <Clock className="w-5 h-5 text-gray-400" />;
  }
};

const getProgressPercentage = () => {
  const completedSteps = workflowSteps.filter(step => step.status === 'completed').length;
  return (completedSteps / workflowSteps.length) * 100;
};


// Fonction pour télécharger le fichier
const downloadFormattedText = () => {

  if (!receivedText) {
    alert('Aucun texte à télécharger');
    return;
  }

  // Créer le blob et le lien de téléchargement
  const blob = new Blob([receivedText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  // Créer un élément <a> temporaire pour déclencher le téléchargement
  const link = document.createElement('a');
  link.href = url;
  
  // Générer le nom du fichier
  const fileName = `${formData.documentType || 'document'}_${formData.meetingTitle?.replace(/\s+/g, '_') || 'reunion'}_${new Date().toISOString().split('T')[0]}.txt`;
  link.download = fileName;
  
// Ajoute, clique et supprime le lien
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Libérer l'URL de l'objet
  URL.revokeObjectURL(url); // Libérer l'URL
  setIsDownloadReady(true); // Mettre à jour l'état pour indiquer que le téléchargement est prêt
  console.log('Fichier téléchargé:', fileName);
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Traitement Intelligent de Réunions
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Transformez vos enregistrements audio en documents professionnels grâce à l'IA
          </p>
        </div>

        {/* Main Form */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Type de document */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Type de document <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['Compte rendu', 'Procès verbal', 'Note de réunion'].map((type) => (
                    <label key={type} className="relative cursor-pointer">
                      <input
                        type="radio"
                        name="documentType"
                        value={type}
                        checked={formData.documentType === type}
                        onChange={(e) => handleInputChange('documentType', e.target.value)}
                        className="sr-only"
                      />
                      <div className={`p-4 border-2 rounded-lg text-center transition-all ${
                        formData.documentType === type 
                          ? 'border-blue-500 bg-blue-50 text-blue-700' 
                          : formErrors.documentType
                          ? 'border-red-300 hover:border-red-400'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <span className="font-medium">{type}</span>
                      </div>
                    </label>
                  ))}
                </div>
                {formErrors.documentType && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <span className="mr-1">⚠️</span>
                    {formErrors.documentType}
                  </p>
                )}
              </div>

              {/* Titre de la réunion */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Titre de la réunion <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.meetingTitle}
                  onChange={(e) => handleInputChange('meetingTitle', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    formErrors.meetingTitle 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300'
                  }`}
                  placeholder="Ex: Réunion de planification trimestrielle"
                />
                {formErrors.meetingTitle && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <span className="mr-1">⚠️</span>
                    {formErrors.meetingTitle}
                  </p>
                )}
              </div>

              {/* Date de la réunion */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date de la réunion <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.meetingDate}
                  onChange={(e) => handleInputChange('meetingDate', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    formErrors.meetingDate 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300'
                  }`}
                />
                {formErrors.meetingDate && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <span className="mr-1">⚠️</span>
                    {formErrors.meetingDate}
                  </p>
                )}
              </div>

              {/* Langue */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Langue <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.language}
                  onChange={(e) => handleInputChange('language', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                    formErrors.language 

                    ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300'
                  }`}
                >
                  <option value="fr">Français</option>
                  <option value="en">Anglais</option>
                  <option value="es">Espagnol</option>
                  <option value="de">Allemand</option>
                </select>
                {formErrors.language && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <span className="mr-1">⚠️</span>
                    {formErrors.language}
                  </p>
                )}
              </div>

              {/* Objectif principal */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Objectif principal de la réunion <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.mainObjective}
                  onChange={(e) => handleInputChange('mainObjective', e.target.value)}
                  rows={3}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none ${
                    formErrors.mainObjective 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300'
                  }`}
                  placeholder="Décrivez brièvement l'objectif principal de cette réunion..."
                />
                {formErrors.mainObjective && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <span className="mr-1">⚠️</span>
                    {formErrors.mainObjective}
                  </p>
                )}
              </div>
              {/* ordres du jour */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ordres du jour <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.ordreJour}
                  onChange={(e) => handleInputChange('ordreJour', e.target.value)}
                  rows={3}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none ${
                    formErrors.ordreJour 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300'
                  }`}
                  placeholder="Listez les points (un par ligne ou séparés par des virgules)"
                />
                {formErrors.ordreJour && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <span className="mr-1">⚠️</span>
                    {formErrors.ordreJour}
                  </p>
                )}
              </div>

              {/* Participants */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Participants
                  <span className="text-gray-500 text-xs ml-2">(optionnel)</span>
                </label>
                <textarea
                  value={formData.participants}
                  onChange={(e) => handleInputChange('participants', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  placeholder="Listez les participants (un par ligne ou séparés par des virgules)"
                />
              </div>

            

              {/* Upload audio */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fichier audio <span className="text-red-500">*</span>
                </label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative cursor-pointer group"
                >
                  <div className={`w-full p-6 border-2 border-dashed rounded-lg transition-all text-center ${
                    formData.audioFile 
                      ? 'border-green-400 bg-green-50' 
                      : formErrors.audioFile
                      ? 'border-red-300 bg-red-50 hover:border-red-400'
                      : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                  }`}>
                    {formData.audioFile ? (
                      <div className="flex items-center justify-center space-x-2">
                        <FileAudio className="w-6 h-6 text-green-600" />
                        <span className="text-green-700 font-medium">
                          {formData.audioFile.name}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-2">
                        <Upload className={`w-8 h-8 transition-colors ${
                          formErrors.audioFile 
                            ? 'text-red-400 group-hover:text-red-500'
                            : 'text-gray-400 group-hover:text-blue-500'
                        }`} />
                        <span className={`transition-colors ${
                          formErrors.audioFile 
                            ? 'text-red-600 group-hover:text-red-700'
                            : 'text-gray-600 group-hover:text-blue-600'
                        }`}>
                          Cliquez pour sélectionner un fichier audio
                        </span>
                        <span className="text-xs text-gray-400">
                          MP3, WAV, M4A, etc.
                        </span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                {formErrors.audioFile && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <span className="mr-1">⚠️</span>
                    {formErrors.audioFile}
                  </p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isProcessing}
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg shadow-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Traitement en cours...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Lancer le traitement
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Progress Section */}
          {isProcessing && (
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Progression du traitement</h3>
              
              {/* Progress Bar */}
              <div className="mb-8">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progression</span>
                  <span>{Math.round(getProgressPercentage())}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${getProgressPercentage()}%` }}
                  />
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-4">
                {workflowSteps.map((step) => (
                  <div key={step.id} className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getStepIcon(step)}
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium ${
                        step.status === 'completed' ? 'text-green-700' :
                        step.status === 'active' ? 'text-blue-700' :
                        step.status === 'error' ? 'text-red-700' : 'text-gray-500'
                      }`}>
                        {step.label}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {step.status === 'completed' && 'Terminé'}
                      {step.status === 'active' && 'En cours...'}
                      {step.status === 'error' && 'Erreur'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Download Section */}
          {downloadUrl && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-8 text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-16 h-16 text-green-500" />
              </div>
              <h3 className="text-2xl font-semibold text-green-800 mb-2">
                Traitement terminé !
              </h3>
              <p className="text-green-700 mb-6">
                Votre document est prêt à être téléchargé.
              </p>
              <button id="download-ready"
                onClick={() => {
                    downloadFormattedText();
                  // Ici vous déclencheriez le téléchargement réel
                  console.log('Téléchargement du fichier...');
                }}
                className="inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all"
              >
                <Download className="w-5 h-5 mr-2 " />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeetingWorkflowApp;
