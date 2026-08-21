import React, { useState } from 'react';
import { X, Send, Upload, Sparkles, CheckCircle2, ShieldAlert, Mic, MapPin } from 'lucide-react';
import { submitReport, analyzeImageFile } from '../../services/api';

interface CitizenReportFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportSubmitted: () => void;
}

export const CitizenReportFormModal: React.FC<CitizenReportFormModalProps> = ({
  isOpen,
  onClose,
  onReportSubmitted,
}) => {
  const [sourceName, setSourceName] = useState('');
  const [sourceType, setSourceType] = useState('verified_citizen');
  const [disasterType, setDisasterType] = useState('Flood');
  const [latitude, setLatitude] = useState(13.0827);
  const [longitude, setLongitude] = useState(80.2707);
  const [description, setDescription] = useState('');
  const [peopleAffected, setPeopleAffected] = useState(4);
  const [medicalNeed, setMedicalNeed] = useState(false);
  const [selectedResources, setSelectedResources] = useState<string[]>(['Rescue Boat']);
  const [imageUrl, setImageUrl] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [imageAnalysisResult, setImageAnalysisResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleResourceToggle = (resName: string) => {
    if (selectedResources.includes(resName)) {
      setSelectedResources(selectedResources.filter((r) => r !== resName));
    } else {
      setSelectedResources([...selectedResources, resName]);
    }
  };

  const toggleVoiceRecording = () => {
    setIsRecordingVoice(!isRecordingVoice);
    if (!isRecordingVoice) {
      setTimeout(() => {
        setDescription('Emergency! Water level rising rapidly on Main Street, 4 people trapped on roof requiring immediate evacuation.');
        setIsRecordingVoice(false);
      }, 2500);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzingImage(true);
    try {
      const res = await analyzeImageFile(file);
      setImageAnalysisResult(res);
      if (res.disaster_type) setDisasterType(res.disaster_type);
      if (res.trapped_people_est > 0) setPeopleAffected(res.trapped_people_est);
      setImageUrl('https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80');
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    setSubmitSuccessMsg(null);

    try {
      const reportData = {
        source: sourceName.trim() || 'Citizen Mobile App',
        source_type: sourceType as any,
        latitude: parseFloat(latitude.toString()),
        longitude: parseFloat(longitude.toString()),
        raw_text: description,
        disaster_type: disasterType,
        severity: (medicalNeed || peopleAffected > 5 ? 'critical' : 'high') as any,
        people_affected: peopleAffected,
        medical_need: medicalNeed,
        resource_requirements: selectedResources,
        image_url: imageUrl || undefined,
      };

      await submitReport(reportData);
      setSubmitSuccessMsg('Emergency report successfully submitted! AI Engine is fusing data.');
      setTimeout(() => {
        setIsSubmitting(false);
        setSubmitSuccessMsg(null);
        onReportSubmitted();
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl animate-fadeIn">
      <div className="liquid-glass border border-white/20 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] relative">
        {/* Top Gloss Reflection */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 bg-slate-950/80 flex items-center justify-between backdrop-blur-xl">
          <div className="flex items-center space-x-3">
            <div className="bg-rose-500/20 p-2.5 rounded-2xl border border-rose-400/40 shadow-glow-red">
              <ShieldAlert className="w-6 h-6 text-rose-300 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">Submit Citizen Emergency Distress Report</h2>
              <p className="text-xs text-slate-300 font-medium">Real-Time AI Multi-Source Deduplication Pipeline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 text-slate-300 hover:text-white hover:bg-white/20 transition-all border border-white/15"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {submitSuccessMsg ? (
            <div className="py-14 text-center space-y-4">
              <CheckCircle2 className="w-16 h-16 text-emerald-300 mx-auto animate-bounce filter drop-shadow-lg" />
              <h3 className="text-lg font-black text-white">{submitSuccessMsg}</h3>
              <p className="text-xs text-slate-300 font-mono">Updating Live Command Center Queue & GIS Markers...</p>
            </div>
          ) : (
            <>
              {/* Reporter Source & Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Reporter Name / Source</label>
                  <input
                    type="text"
                    placeholder="e.g., Citizen #1024 or SACHET"
                    value={sourceName}
                    onChange={(e) => setSourceName(e.target.value)}
                    className="w-full bg-black/40 border border-white/15 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Source Verification Category</label>
                  <select
                    value={sourceType}
                    onChange={(e) => setSourceType(e.target.value)}
                    className="w-full bg-black/40 border border-white/15 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-bold cursor-pointer"
                  >
                    <option value="verified_citizen" className="bg-slate-900">Verified Citizen (Conf 82%)</option>
                    <option value="unverified_citizen" className="bg-slate-900">Unverified Citizen (Conf 65%)</option>
                    <option value="official" className="bg-slate-900">Official Alert (Conf 95%)</option>
                    <option value="agency" className="bg-slate-900">Emergency Agency (Conf 92%)</option>
                    <option value="social" className="bg-slate-900">Social Media Feed (Conf 50%)</option>
                  </select>
                </div>
              </div>

              {/* Disaster Type & People Count */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Disaster Type</label>
                  <select
                    value={disasterType}
                    onChange={(e) => setDisasterType(e.target.value)}
                    className="w-full bg-black/40 border border-white/15 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-bold cursor-pointer"
                  >
                    <option value="Flood" className="bg-slate-900">Flood</option>
                    <option value="Cyclone" className="bg-slate-900">Cyclone</option>
                    <option value="Earthquake" className="bg-slate-900">Earthquake</option>
                    <option value="Fire" className="bg-slate-900">Fire</option>
                    <option value="Infrastructure" className="bg-slate-900">Infrastructure Collapse</option>
                    <option value="Medical" className="bg-slate-900">Medical Emergency</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">People Trapped / Affected</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={peopleAffected}
                    onChange={(e) => setPeopleAffected(parseInt(e.target.value) || 0)}
                    className="w-full bg-black/40 border border-white/15 rounded-xl p-2.5 text-xs text-amber-300 font-black focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* GPS Coordinates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Latitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={latitude}
                    onChange={(e) => setLatitude(parseFloat(e.target.value))}
                    className="w-full bg-black/40 border border-white/15 rounded-xl p-2.5 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-400 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Longitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={longitude}
                    onChange={(e) => setLongitude(parseFloat(e.target.value))}
                    className="w-full bg-black/40 border border-white/15 rounded-xl p-2.5 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-400 font-bold"
                  />
                </div>
              </div>

              {/* Description & Voice Dictation Simulation */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-300">Detailed Situation Description *</label>
                  <button
                    type="button"
                    onClick={toggleVoiceRecording}
                    className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl border transition-all ${
                      isRecordingVoice 
                        ? 'bg-rose-500/30 text-rose-200 border-rose-400/60 animate-pulse'
                        : 'bg-white/10 text-cyan-300 border-white/15 hover:bg-white/20'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>{isRecordingVoice ? 'Listening...' : 'Voice Dictate'}</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe ground situation, trapped individuals, road conditions..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-400 leading-relaxed font-medium"
                />
              </div>

              {/* Urgent Medical Checkbox */}
              <div className="flex items-center space-x-3 bg-rose-500/15 p-3 rounded-2xl border border-rose-400/40">
                <input
                  type="checkbox"
                  id="medical-check"
                  checked={medicalNeed}
                  onChange={(e) => setMedicalNeed(e.target.checked)}
                  className="w-4 h-4 text-rose-500 rounded focus:ring-0 cursor-pointer"
                />
                <label htmlFor="medical-check" className="text-xs font-black text-rose-200 cursor-pointer">
                  Urgent Medical Assistance Required (Injuries, Bleeding, Oxygen)
                </label>
              </div>

              {/* Resource Requirements Checkboxes */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">Select Required Emergency Aid</label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {['Rescue Boat', 'NDRF Rescue Team', 'Ambulance', 'Medical Kit', 'Food Rations', 'Drinking Water'].map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => handleResourceToggle(res)}
                      className={`p-2.5 rounded-xl border text-left transition-all font-bold ${
                        selectedResources.includes(res)
                          ? 'liquid-glass-pill-active text-cyan-200 border-cyan-400/60 shadow-glow-cyan'
                          : 'bg-black/30 border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              {/* Image Upload & AI Vision Preview */}
              <div className="border border-dashed border-white/20 rounded-2xl p-4 bg-black/30 text-center">
                <div className="flex items-center justify-center space-x-2">
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-slate-200 font-bold">Upload Ground Photo Evidence</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="mt-2 text-xs text-slate-400 block mx-auto cursor-pointer"
                />

                {isAnalyzingImage && (
                  <div className="mt-2 text-xs text-cyan-300 flex items-center justify-center gap-1.5 animate-pulse font-bold">
                    <Sparkles className="w-4 h-4 text-cyan-300 animate-spin-slow" /> AI Vision Engine Extraction in Progress...
                  </div>
                )}

                {imageAnalysisResult && (
                  <div className="mt-3 bg-black/60 p-3 rounded-xl border border-cyan-400/40 text-left text-xs space-y-1">
                    <div className="font-black text-cyan-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-300" /> AI Vision Analysis Result:
                    </div>
                    <div className="text-slate-200">
                      Disaster: <span className="font-black text-white">{imageAnalysisResult.disaster_type}</span> | Severity: <span className="font-black text-rose-300">{imageAnalysisResult.severity}</span>
                    </div>
                    <div className="text-slate-400 font-mono">
                      Objects Detected: {imageAnalysisResult.objects_detected?.join(', ')}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full liquid-glass-danger-button text-white font-black text-xs py-3.5 rounded-2xl shadow-glow-red transition-all flex items-center justify-center space-x-2.5 cursor-pointer tracking-wider"
              >
                <Send className="w-4 h-4 text-rose-200 animate-pulse" />
                <span>{isSubmitting ? 'FUSING REPORT INTO INTELLIGENCE PIPELINE...' : 'SUBMIT EMERGENCY REPORT'}</span>
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

