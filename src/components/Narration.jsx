import React, { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { Square, Volume2, VolumeX } from 'lucide-react';
import { speechService } from '../utils/speech';

const NarrationContext = createContext(null);

export function NarrationProvider({ children }) {
  const scene = useRef(null);
  const active = useRef(null);
  const automatic = useRef(false);
  const [enabled, setEnabled] = useState(false);
  const [playing, setPlaying] = useState(null);
  const [failed, setFailed] = useState(null);
  const supported = speechService.available;

  const stop = useCallback(id => {
    if (id !== undefined && active.current !== id) return;
    active.current = null;
    speechService.stop();
    setPlaying(null);
  }, []);

  const play = useCallback(cue => {
    if (!supported || !cue?.text) return;
    active.current = cue.id;
    setPlaying(cue.id);
    setFailed(null);
    speechService.speak(cue.text, error => {
      if (active.current !== cue.id) return;
      active.current = null;
      setPlaying(null);
      if (error) setFailed(cue.id);
    });
  }, [supported]);

  const register = useCallback(cue => {
    scene.current = cue;
    if (automatic.current) play(cue);
    return () => {
      if (scene.current === cue) scene.current = null;
      stop(cue.id);
    };
  }, [play, stop]);

  function toggleAutomatic() {
    automatic.current = !automatic.current;
    setEnabled(automatic.current);
    if (automatic.current) play(scene.current);
    else stop();
  }

  return <NarrationContext.Provider value={{ supported, enabled, playing, failed, register, play, stop, toggleAutomatic }}>
    {children}
  </NarrationContext.Provider>;
}

export function NarrationToggle() {
  const { supported, enabled, toggleAutomatic } = useContext(NarrationContext);
  if (!supported) return null;
  const Icon = enabled ? Volume2 : VolumeX;
  return <button type="button" className="header-tool narration-toggle" aria-label="Automatic narration" aria-pressed={enabled} onClick={toggleAutomatic}>
    <Icon size={18} aria-hidden="true" /> Voice {enabled ? 'on' : 'off'}
  </button>;
}

export default function Narration({ text, label, scene = true }) {
  const id = useId();
  const { supported, playing, failed, register, play, stop } = useContext(NarrationContext);

  useEffect(() => {
    if (!supported || !text) return;
    if (scene) return register({ id, text });
    return () => stop(id);
  }, [id, text, scene, supported, register, stop]);

  if (!supported || !text) return null;
  const active = playing === id;
  const Icon = active ? Square : Volume2;
  return <div className="narration-control">
    <button type="button" className="voice-action" onClick={() => active ? stop(id) : play({ id, text })}>
      <Icon size={16} aria-hidden="true" /> {active ? 'Stop listening' : label}
    </button>
    {failed === id && <p role="status" className="narration-error">Audio couldn’t play. Select Listen to try again.</p>}
  </div>;
}
