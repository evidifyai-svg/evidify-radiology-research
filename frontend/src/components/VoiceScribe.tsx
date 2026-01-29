// VoiceScribe.tsx
// Hero feature: 90-second debrief → complete progress note
// This is the demo. Make it flawless.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

// ============================================
// Types
// ============================================

interface VoiceScribeProps {
  clientId: string;
  clientName: string;
  onNoteCreated: (noteId: string) => void;
  onCancel: () => void;
}

interface RecordingState {
  status: 'idle' | 'countdown' | 'recording' | 'processing' | 'reviewing' | 'saving' | 'complete' | 'error';
  duration: number;
  maxDuration: number;
  audioLevel: number;
  transcript: string;
  structuredNote: StructuredNote | null;
  error: string | null;
}

interface StructuredNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  interventions: string[];
  riskLevel: 'low' | 'moderate' | 'high' | null;
  nextSession: string | null;
}

interface VoiceStatus {
  whisper_installed: boolean;
  whisper_command: string | null;
  models_available: string[];
  ffmpeg_installed: boolean;
}

// ============================================
// Voice Scribe Component
// ============================================

export const VoiceScribe: React.FC<VoiceScribeProps> = ({
  clientId,
  clientName,
  onNoteCreated,
  onCancel,
}) => {
  const [state, setState] = useState<RecordingState>({
    status: 'idle',
    duration: 0,
    maxDuration: 120, // 2 minutes max
    audioLevel: 0,
    transcript: '',
    structuredNote: null,
    error: null,
  });

  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [showTips, setShowTips] = useState(true);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Check voice capabilities on mount
  useEffect(() => {
    checkVoiceStatus();
  }, []);

  const checkVoiceStatus = async () => {
    try {
      const status = await invoke<VoiceStatus>('get_voice_status');
      setVoiceStatus(status);
    } catch (err) {
      console.error('Failed to check voice status:', err);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Start countdown before recording
  const startCountdown = useCallback(() => {
    setState(s => ({ ...s, status: 'countdown' }));
    setCountdown(3);
    setShowTips(false);

    const countdownTimer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(countdownTimer);
          startRecording();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, []);

  // Check microphone permission status
  const checkMicrophonePermission = async (): Promise<'granted' | 'denied' | 'prompt' | 'unavailable'> => {
    // Check if mediaDevices API is available at all
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return 'unavailable';
    }
    
    // Try to check permission status via Permissions API (not all browsers support this)
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        return result.state as 'granted' | 'denied' | 'prompt';
      }
    } catch {
      // Permissions API not supported, we'll try getUserMedia directly
    }
    
    return 'prompt'; // Assume we can prompt
  };

  // Start actual recording
  const startRecording = async () => {
    try {
      // Check permission status first
      const permissionStatus = await checkMicrophonePermission();
      
      if (permissionStatus === 'unavailable') {
        throw new Error(
          'MICROPHONE_UNAVAILABLE: Voice recording is not available in this environment.\n\n' +
          'This can happen because:\n' +
          '• The app is running in development mode without code signing\n' +
          '• macOS has not granted microphone permission to this app\n' +
          '• The WebView does not support audio capture\n\n' +
          'Workaround: Use the text input mode below to type or paste your notes.'
        );
      }
      
      if (permissionStatus === 'denied') {
        throw new Error(
          'MICROPHONE_DENIED: Microphone access was previously denied.\n\n' +
          'To fix this:\n' +
          '1. Open System Settings → Privacy & Security → Microphone\n' +
          '2. Find Evidify in the list and enable access\n' +
          '3. Restart the app\n\n' +
          'Or use text input mode below.'
        );
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        } 
      });

      // Set up audio analysis for level meter
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Start level monitoring
      const updateLevel = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setState(s => ({ ...s, audioLevel: average / 255 }));
        }
        animationRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        await processRecording();
      };

      mediaRecorder.start(1000); // Collect data every second
      startTimeRef.current = Date.now();

      // Start duration timer
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setState(s => {
          if (elapsed >= s.maxDuration) {
            stopRecording();
            return s;
          }
          return { ...s, duration: elapsed };
        });
      }, 100);

      setState(s => ({ ...s, status: 'recording', duration: 0 }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      // Provide specific guidance based on error type
      let userFriendlyError = errorMessage;
      if (errorMessage.includes('NotAllowedError') || errorMessage.includes('Permission denied')) {
        userFriendlyError = 'Microphone permission denied. Go to System Settings → Privacy & Security → Microphone to enable access for Evidify.';
      } else if (errorMessage.includes('NotFoundError') || errorMessage.includes('Requested device not found')) {
        userFriendlyError = 'No microphone found. Please connect a microphone and try again.';
      } else if (!errorMessage.startsWith('MICROPHONE_')) {
        userFriendlyError = `Microphone error: ${errorMessage}\n\nYou can use text input mode instead.`;
      }
      
      setState(s => ({ 
        ...s, 
        status: 'error', 
        error: userFriendlyError
      }));
    }
  };

  // Stop recording
  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Process the recording
  const processRecording = async () => {
    setState(s => ({ ...s, status: 'processing' }));

    try {
      // Convert audio chunks to blob
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Convert to base64 for sending to backend
      const reader = new FileReader();
      const audioBase64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(',')[1]);
        };
        reader.readAsDataURL(audioBlob);
      });

      // Send to backend for transcription
      const transcript = await invoke<string>('transcribe_audio_base64', {
        audioData: audioBase64,
        format: 'webm',
      });

      setState(s => ({ ...s, transcript }));

      // Structure the note using AI
      const structuredNote = await invoke<StructuredNote>('structure_voice_note', {
        transcript,
        clientId,
      });

      setState(s => ({ 
        ...s, 
        status: 'reviewing',
        structuredNote,
      }));
    } catch (err) {
      setState(s => ({ 
        ...s, 
        status: 'error', 
        error: `Processing failed: ${err}` 
      }));
    }
  };

  // Save the note
  const saveNote = async () => {
    if (!state.structuredNote) return;

    setState(s => ({ ...s, status: 'saving' }));

    try {
      const content = formatNoteContent(state.structuredNote);
      
      const noteId = await invoke<string>('create_note', {
        clientId,
        noteType: 'progress',
        content,
      });

      setState(s => ({ ...s, status: 'complete' }));
      
      // Brief pause to show success state
      setTimeout(() => {
        onNoteCreated(noteId);
      }, 1000);
    } catch (err) {
      setState(s => ({ 
        ...s, 
        status: 'error', 
        error: `Failed to save note: ${err}` 
      }));
    }
  };

  // Format structured note to text
  const formatNoteContent = (note: StructuredNote): string => {
    let content = '';
    
    if (note.subjective) {
      content += `## Subjective\n${note.subjective}\n\n`;
    }
    if (note.objective) {
      content += `## Objective\n${note.objective}\n\n`;
    }
    if (note.assessment) {
      content += `## Assessment\n${note.assessment}\n\n`;
    }
    if (note.plan) {
      content += `## Plan\n${note.plan}\n\n`;
    }
    if (note.interventions?.length > 0) {
      content += `## Interventions\n${note.interventions.map(i => `- ${i}`).join('\n')}\n\n`;
    }
    if (note.nextSession) {
      content += `## Next Session\n${note.nextSession}\n`;
    }

    return content;
  };

  // Edit structured note
  const updateStructuredNote = (field: keyof StructuredNote, value: string | string[]) => {
    setState(s => ({
      ...s,
      structuredNote: s.structuredNote ? { ...s.structuredNote, [field]: value } : null,
    }));
  };

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ============================================
  // Render
  // ============================================

  // Check if voice is available
  if (voiceStatus && !voiceStatus.whisper_installed) {
    return (
      <div className="voice-scribe voice-scribe--setup">
        <div className="voice-scribe__icon voice-scribe__icon--warning">Warning</div>
        <h2>Voice Scribe Setup Required</h2>
        <p>Whisper is not installed. To use Voice Scribe, install whisper.cpp:</p>
        <pre className="voice-scribe__code">
          brew install whisper-cpp{'\n'}
          mkdir -p ~/whisper-models{'\n'}
          curl -L -o ~/whisper-models/ggml-base.en.bin \{'\n'}
          {'  '}'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin'
        </pre>
        <button onClick={onCancel} className="btn btn--secondary">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="voice-scribe" data-status={state.status}>
      {/* Header */}
      <div className="voice-scribe__header">
        <h2>Voice Scribe</h2>
        <span className="voice-scribe__client">{clientName}</span>
        {state.status !== 'complete' && (
          <button 
            onClick={onCancel} 
            className="voice-scribe__close"
            aria-label="Cancel"
          >
            ×
          </button>
        )}
      </div>

      {/* Content based on status */}
      <div className="voice-scribe__content">
        
        {/* Idle State */}
        {state.status === 'idle' && (
          <div className="voice-scribe__idle">
            <div className="voice-scribe__mic-icon">Voice</div>
            <h3>Quick Session Debrief</h3>
            <p className="voice-scribe__description">
              Speak naturally about your session for 60-90 seconds. 
              Evidify will structure it into a complete progress note.
            </p>
            
            {showTips && (
              <div className="voice-scribe__tips">
                <h4>Tips for best results:</h4>
                <ul>
                  <li>Mention the client's presentation and mood</li>
                  <li>Describe interventions you used</li>
                  <li>Note any safety concerns or risk factors</li>
                  <li>State your clinical impressions</li>
                  <li>Outline the plan for next session</li>
                </ul>
              </div>
            )}

            <button 
              onClick={startCountdown}
              className="btn btn--primary btn--large voice-scribe__start"
            >
              <span className="btn__icon">Voice</span>
              Start Recording
            </button>
          </div>
        )}

        {/* Countdown State */}
        {state.status === 'countdown' && (
          <div className="voice-scribe__countdown">
            <div className="voice-scribe__countdown-number">{countdown}</div>
            <p>Get ready to speak...</p>
          </div>
        )}

        {/* Recording State */}
        {state.status === 'recording' && (
          <div className="voice-scribe__recording">
            <div className="voice-scribe__visualizer">
              <div 
                className="voice-scribe__level"
                style={{ transform: `scaleY(${0.2 + state.audioLevel * 0.8})` }}
              />
              <div className="voice-scribe__pulse" />
            </div>
            
            <div className="voice-scribe__timer">
              <span className="voice-scribe__duration">
                {formatDuration(state.duration)}
              </span>
              <span className="voice-scribe__max">
                / {formatDuration(state.maxDuration)}
              </span>
            </div>

            <div className="voice-scribe__progress">
              <div 
                className="voice-scribe__progress-bar"
                style={{ width: `${(state.duration / state.maxDuration) * 100}%` }}
              />
            </div>

            <p className="voice-scribe__prompt">
              Speak naturally about the session...
            </p>

            <button 
              onClick={stopRecording}
              className="btn btn--danger btn--large voice-scribe__stop"
            >
              <span className="btn__icon">⏹</span>
              Done Recording
            </button>

            <p className="voice-scribe__hint">
              Press when finished, or recording will auto-stop at {formatDuration(state.maxDuration)}
            </p>
          </div>
        )}

        {/* Processing State */}
        {state.status === 'processing' && (
          <div className="voice-scribe__processing">
            <div className="voice-scribe__spinner" />
            <h3>Processing your recording...</h3>
            <div className="voice-scribe__steps">
              <div className="voice-scribe__step voice-scribe__step--active">
                <span className="voice-scribe__step-icon">Voice</span>
                Transcribing audio
              </div>
              <div className="voice-scribe__step">
                <span className="voice-scribe__step-icon">AI</span>
                Structuring note
              </div>
              <div className="voice-scribe__step">
                <span className="voice-scribe__step-icon">Review</span>
                Checking for safety flags
              </div>
            </div>
            <p className="voice-scribe__privacy">
              <span className="voice-scribe__lock">Locked</span>
              All processing happens on your device. No data leaves this computer.
            </p>
          </div>
        )}

        {/* Review State */}
        {state.status === 'reviewing' && state.structuredNote && (
          <div className="voice-scribe__review">
            <h3>Review Your Note</h3>
            <p className="voice-scribe__review-hint">
              Edit any section before saving
            </p>

            <div className="voice-scribe__sections">
              <div className="voice-scribe__section">
                <label>Subjective</label>
                <textarea
                  value={state.structuredNote.subjective}
                  onChange={(e) => updateStructuredNote('subjective', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="voice-scribe__section">
                <label>Objective</label>
                <textarea
                  value={state.structuredNote.objective}
                  onChange={(e) => updateStructuredNote('objective', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="voice-scribe__section">
                <label>Assessment</label>
                <textarea
                  value={state.structuredNote.assessment}
                  onChange={(e) => updateStructuredNote('assessment', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="voice-scribe__section">
                <label>Plan</label>
                <textarea
                  value={state.structuredNote.plan}
                  onChange={(e) => updateStructuredNote('plan', e.target.value)}
                  rows={3}
                />
              </div>

              {state.structuredNote.riskLevel && state.structuredNote.riskLevel !== 'low' && (
                <div className="voice-scribe__risk-alert" data-level={state.structuredNote.riskLevel}>
                  <span className="voice-scribe__risk-icon">Warning</span>
                  <span>
                    {state.structuredNote.riskLevel === 'high' 
                      ? 'High risk factors detected. Review carefully before signing.'
                      : 'Moderate risk factors noted. Ensure documentation is complete.'}
                  </span>
                </div>
              )}
            </div>

            <div className="voice-scribe__actions">
              <button 
                onClick={() => setState(s => ({ ...s, status: 'idle', structuredNote: null }))}
                className="btn btn--secondary"
              >
                Start Over
              </button>
              <button 
                onClick={saveNote}
                className="btn btn--primary"
              >
                Save Note
              </button>
            </div>
          </div>
        )}

        {/* Saving State */}
        {state.status === 'saving' && (
          <div className="voice-scribe__saving">
            <div className="voice-scribe__spinner" />
            <h3>Saving note...</h3>
          </div>
        )}

        {/* Complete State */}
        {state.status === 'complete' && (
          <div className="voice-scribe__complete">
            <div className="voice-scribe__success-icon">Success</div>
            <h3>Note Created!</h3>
            <p>Your progress note has been saved and is ready for review.</p>
          </div>
        )}

        {/* Error State */}
        {state.status === 'error' && (
          <div className="voice-scribe__error">
            <div className="voice-scribe__error-icon">Warning</div>
            <h3>Voice Recording Unavailable</h3>
            <pre style={{ 
              whiteSpace: 'pre-wrap', 
              textAlign: 'left', 
              fontSize: '0.85rem',
              background: 'rgba(0,0,0,0.2)',
              padding: '1rem',
              borderRadius: '8px',
              maxWidth: '500px',
              margin: '1rem auto'
            }}>
              {state.error}
            </pre>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
              <button 
                onClick={() => setState(s => ({ ...s, status: 'idle', error: null }))}
                className="btn btn--secondary"
              >
                Try Again
              </button>
              <button 
                onClick={onCancel}
                className="btn btn--primary"
              >
                Use Text Input
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceScribe;
