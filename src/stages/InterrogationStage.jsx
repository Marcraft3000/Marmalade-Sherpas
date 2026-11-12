import React, { useState, useEffect } from 'react';
import { ArrowRight, Mic, MicOff, MessageSquare, AlertCircle, HelpCircle } from 'lucide-react';
import AuditorAvatar from '../components/AuditorAvatar';
import { speechService } from '../utils/speech';

export default function InterrogationStage({
  session,
  caseData,
  onCompleteInterrogation,
  isMuted,
}) {
  const [step, setStep] = useState(0);
  const [sliderValue, setSliderValue] = useState(50);
  const [sliderTouched, setSliderTouched] = useState(false);
  const [confidence, setConfidence] = useState('');
  const [concern, setConcern] = useState('');
  const [customConcern, setCustomConcern] = useState('');
  const [priority, setPriority] = useState('');
  const [futureExpectation, setFutureExpectation] = useState('');
  const [answers, setAnswers] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  // Couple mode active partner toggle
  const [activePartner, setActivePartner] = useState(
    session.isCoupleMode && session.caseId === 'timothy-melanie-weah' ? 'Timothy' :
    session.isCoupleMode && session.caseId === 'daniel-emily-johnson' ? 'Daniel' : null
  );

  // Dynamic reactive quips from Caleb Hammer as the user moves the slider
  const getSliderQuip = (val) => {
    if (val >= 85) return "That’s a lot of confidence. Let’s see whether the plan tells the same story.";
    if (val >= 70) return "You’re feeling positive about things. I’ll keep that in mind as we look closer.";
    if (val >= 50) return "A measured answer. What matters is what sits behind the number.";
    return "It sounds like there may be some real pressure. We’ll take it one step at a time.";
  };

  // Case-specific concern chips
  const CONCERNS_BY_CASE = {
    'timothy-melanie-weah': ["Making sure our money supports the goals we share", "Finding a balance between security and growth", "Feeling confident about our family's next steps", "Making our day-to-day finances feel more manageable"],
    'michael-carter': ["Balancing the goals I have for the next few years", "Feeling more in control of my monthly finances", "Knowing whether my long-term plans are realistic", "Building a plan I can stick to"],
    'daniel-emily-johnson': ["Making sure our family is prepared for the unexpected", "Balancing today's needs with our children's future", "Feeling aligned on our financial decisions", "Making our next steps clearer"],
    'samantha-lewis': ["Planning confidently for the next stage of life", "Balancing family goals with my own future", "Knowing whether my long-term plan is sustainable", "Making the most of the choices I have today"]
  };

  const caseConcerns = CONCERNS_BY_CASE[session.caseId] || [
    "Planning for the future",
    "Managing monthly finances",
    "Preparing for the unexpected",
    "Making room for important goals"
  ];

  const PRIORITIES = [
    "Build a stronger financial safety net",
    "Make more room for our goals",
    "Feel more in control of monthly spending",
    "Plan confidently for the long term",
    "Reduce the stress around money decisions"
  ];

  // Speak initial intro once
  useEffect(() => {
    const introText = "Alright. Before I look at the numbers, I want to hear your side of the story. No charts. No spreadsheets. Just honest answers. Let's see what you think is really going on.";
    speechService.speak(introText, () => setSpeaking(true), () => setSpeaking(false));
  }, []);

  const handleNextStep = () => {
    if (step === 0 && !sliderTouched) return;
    if (step === 1 && !confidence) return;
    if (step === 2 && !customConcern.trim() && !concern) return;
    if (step === 3 && !priority) return;
    // Collect answer for the current step
    let answerObj = null;

    if (step === 0) {
      answerObj = {
        category: 'perceived_health',
        question: 'On a scale from 0 to 100, how healthy do you think your household finances are?',
        value: sliderValue,
        partner: activePartner,
      };
      // If couple mode, maybe ask partner 2 as well before moving to step 1
      if (session.isCoupleMode && activePartner === 'Timothy') {
        setActivePartner('Melanie');
        setAnswers(prev => [...prev, answerObj]);
        setSliderValue(50);
        setSliderTouched(false);
        return;
      }
      if (session.isCoupleMode && activePartner === 'Daniel') {
        setActivePartner('Emily');
        setAnswers(prev => [...prev, answerObj]);
        setSliderValue(50);
        setSliderTouched(false);
        return;
      }
    } else if (step === 1) {
      answerObj = {
        category: 'confidence',
        question: 'How confident are you that you are making the right financial decisions?',
        value: confidence,
      };
    } else if (step === 2) {
      answerObj = {
        category: 'main_concern',
        question: 'What is the one financial thing that worries you the most?',
        value: customConcern.trim() || concern || caseConcerns[0],
      };
    } else if (step === 3) {
      answerObj = {
        category: 'financial_priority',
        question: 'If you could fix one thing about your finances right now, what would it be?',
        value: priority || PRIORITIES[0],
      };
    }

    if (answerObj) {
      setAnswers(prev => [...prev, answerObj]);
    }

    if (step < 3) {
      setStep(step + 1);
    } else {
      // Completed interrogation!
      const finalAnswers = answerObj ? [...answers, answerObj] : answers;
      onCompleteInterrogation(finalAnswers, sliderValue);
    }
  };

  const handleToggleVoiceInput = () => {
    if (isListening) {
      speechService.stopListening();
      setIsListening(false);
    } else {
      setIsListening(true);
      speechService.startListening(
        (transcript) => {
          setIsListening(false);
          setCustomConcern(transcript);
        },
        (err) => {
          console.warn(err);
          setIsListening(false);
        }
      );
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      {/* Auditor Character Box */}
      <AuditorAvatar
        speaking={speaking}
        mood={step === 0 ? "SUSPICIOUS" : step === 2 ? "ROASTING" : "DISSECTING"}
        text={
          step === 0
            ? getSliderQuip(sliderValue)
            : step === 1
            ? "Confidence without verified math is just wishful thinking. Let us see how confident you really feel."
            : step === 2
            ? "Every household has that one worry that keeps them awake at 2 AM. Be honest with me."
            : "If we had a magic wand to resolve one headache today, where do you want to start?"
        }
        onReplay={() => {
          const text = step === 0 ? getSliderQuip(sliderValue) : "Tell me what keeps you up at night.";
          speechService.speak(text, () => setSpeaking(true), () => setSpeaking(false));
        }}
      />

      {/* Main Question Card */}
      <div className="bg-[#0E1315] border border-[#1C2529] rounded-2xl p-6 md:p-8 shadow-2xl relative">
        {/* Progress indicator */}
        <div className="flex items-center justify-between text-xs text-[#92979B] font-mono mb-6">
          <span className="uppercase tracking-wider">
            QUESTION {step + 1} OF 4
            {session.isCoupleMode && activePartner && (
              <span className="text-[#B8DBD9] ml-2">[{activePartner}'s perspective]</span>
            )}
          </span>
          <span>STAGE 1: THE INTERROGATION</span>
        </div>

        {/* STEP 0: Perceived Financial Health Slider */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                {session.isCoupleMode && activePartner
                  ? `${activePartner}, on a scale from 0 to 100, how healthy do you think your finances are?`
                  : "On a scale from 0 to 100, how healthy do you think your financial situation is?"}
              </h2>
              <p className="text-sm text-[#92979B]">
                Do not think about what you wish it was. Give me your gut number right now.
              </p>
            </div>

            {/* Giant Number Display */}
            <div className="text-center py-6">
              <div className="text-6xl md:text-7xl font-black font-mono tracking-tight text-[#B8DBD9] drop-shadow-[0_0_20px_rgba(4,114,77,0.3)]">
                {sliderValue}
              </div>
              <div className="text-xs uppercase font-mono tracking-wider text-[#92979B] mt-2">
                {sliderValue >= 80 ? "STRONG / OPTIMISTIC" : sliderValue >= 60 ? "MODERATE / STABLE" : sliderValue >= 40 ? "VULNERABLE" : "CRITICAL"}
              </div>
            </div>

            {/* Slider */}
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="100"
                value={sliderValue}
                aria-label="Your estimated financial health, from 0 to 100"
                onChange={(e) => { setSliderValue(Number(e.target.value)); setSliderTouched(true); }}
                className="w-full h-3 bg-[#0A0D0E] rounded-lg appearance-none cursor-pointer accent-[#04724D] border border-[#1C2529]"
              />
              <div className="flex justify-between text-xs font-mono text-[#92979B]">
                <span>0 - Needs support</span>
                <span>50 - In the middle</span>
                <span>100 - Excellent</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: Confidence */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                How confident are you that you're making the right financial decisions?
              </h2>
              <p className="text-sm text-[#92979B]">
                Are you executing an intentional game plan, or simply winging it from paycheck to paycheck?
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Very Confident', desc: 'We have a clear strategy and follow it faithfully.' },
                { label: 'Somewhat Confident', desc: 'Things generally work out, but we have big question marks.' },
                { label: 'Unsure & Hesitant', desc: 'We keep deferring big money moves out of uncertainty.' },
                { label: 'Stressed & Overwhelmed', desc: 'Our expenses and debts feel like they control us.' },
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setConfidence(opt.label)}
                  className={`p-4 rounded-xl text-left border transition-all ${
                    confidence === opt.label
                      ? 'bg-[#04724D]/15 border-[#04724D] text-white shadow-[0_0_15px_rgba(4,114,77,0.15)]'
                      : 'bg-[#0A0D0E] border-[#1C2529] text-[#92979B] hover:text-white hover:border-[#474E54]'
                  }`}
                >
                  <div className="font-bold text-sm text-white mb-1">{opt.label}</div>
                  <div className="text-xs text-[#92979B]">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Main Concern */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                What is the ONE financial thing that worries you the most?
              </h2>
              <p className="text-sm text-[#92979B]">
                Pick the one that rings closest to home, or dictate your own in your words.
              </p>
            </div>

            <div className="space-y-2">
              {caseConcerns.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setConcern(c);
                    setCustomConcern('');
                  }}
                  className={`w-full p-3.5 rounded-xl text-left border text-xs md:text-sm transition-all flex items-center justify-between ${
                    concern === c && !customConcern
                      ? 'bg-[#04724D]/15 border-[#04724D] text-white font-medium'
                      : 'bg-[#0A0D0E] border-[#1C2529] text-[#92979B] hover:text-white'
                  }`}
                >
                  <span>"{c}"</span>
                  {concern === c && !customConcern && (
                    <span className="text-[#B8DBD9] font-bold text-xs">SELECTED</span>
                  )}
                </button>
              ))}
            </div>

            {/* Custom text or voice dictate */}
            <div className="pt-2">
              <label className="text-xs font-mono text-[#92979B] mb-1.5 block">
                OR STATE YOUR OWN CONCERN:
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. I am terrified of our credit card interest compounding..."
                  value={customConcern}
                  onChange={(e) => {
                    setCustomConcern(e.target.value);
                    setConcern('');
                  }}
                  className="w-full bg-[#0A0D0E] border border-[#1C2529] rounded-xl px-4 py-3 text-sm text-white placeholder-[#474E54] focus:outline-none focus:border-[#04724D] pr-12"
                />
                <button
                  onClick={handleToggleVoiceInput}
                  className={`absolute right-2 top-2 p-2 rounded-lg border transition-colors ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse border-red-600'
                      : 'bg-[#101719] text-[#92979B] hover:text-white border-[#1C2529]'
                  }`}
                  title={isListening ? "Listening... click to stop" : "Speak your answer with microphone"}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Financial Priority */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                If you could fix ONE thing about your finances right now, what would it be?
              </h2>
              <p className="text-sm text-[#92979B]">
                Your audit mission will be directly calibrated against this priority.
              </p>
            </div>

            <div className="space-y-2.5">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`w-full p-4 rounded-xl text-left border text-sm transition-all flex items-center justify-between ${
                    priority === p
                      ? 'bg-[#04724D]/15 border-[#04724D] text-white font-semibold'
                      : 'bg-[#0A0D0E] border-[#1C2529] text-[#92979B] hover:text-white'
                  }`}
                >
                  <span>{p}</span>
                  {priority === p && (
                    <span className="text-[#B8DBD9] font-mono text-xs font-bold">TOP PRIORITY</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-8 pt-6 border-t border-[#1C2529] flex items-center justify-between">
          <div className="text-xs text-[#92979B]">
            All answers are locked before the Sherpas reveal.
          </div>

          <button
            onClick={handleNextStep}
            disabled={(step === 0 && !sliderTouched) || (step === 1 && !confidence) || (step === 2 && !customConcern.trim() && !concern) || (step === 3 && !priority)}
            className="px-6 py-3 rounded-xl bg-[#04724D] hover:bg-[#03593C] text-white font-bold text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(4,114,77,0.3)] transition-all disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            <span>{step === 3 ? "LOCK ANSWERS & HEAR SUMMARY" : "NEXT QUESTION"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
