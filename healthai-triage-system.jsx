import React, { useState } from 'react';
import {
  Wind, Thermometer, Frown, Brain, Activity, Heart, AlertCircle, RotateCw,
  Search, CheckCircle, ChevronDown, ArrowLeft, Loader2, Send,
  Clock, User, Users, Stethoscope, ClipboardList, ShieldAlert, Info, Plus, RefreshCw, Pencil
} from 'lucide-react';

const SYMPTOMS = [
  { id: 'cough', label: 'ไอ', Icon: Wind },
  { id: 'fever', label: 'เป็นไข้', Icon: Thermometer },
  { id: 'sorethroat', label: 'เจ็บคอ', Icon: Frown },
  { id: 'headache', label: 'ปวดศีรษะ', Icon: Brain },
  { id: 'stomach', label: 'ปวดท้อง', Icon: Activity },
  { id: 'chest', label: 'เจ็บหน้าอก', Icon: Heart },
  { id: 'breath', label: 'หายใจลำบาก', Icon: AlertCircle },
  { id: 'dizzy', label: 'เวียนศีรษะ', Icon: RotateCw },
];

const REGIONS = ['บนขวา', 'บนกลาง', 'บนซ้าย', 'ขวา', 'รอบสะดือ', 'ซ้าย', 'ล่างขวา', 'ล่างกลาง', 'ล่างซ้าย'];
const CHARACTERS = ['บีบเกร็ง', 'เสียด', 'ปวดร้าว'];

function emptyDraft() {
  return { name: '', age: '', sex: 'ชาย', symptoms: [], region: '', character: '', duration: '', notes: '' };
}

function Logo({ size = 'md' }) {
  const box = size === 'lg' ? 'w-20 h-20' : 'w-9 h-9';
  const icon = size === 'lg' ? 'w-10 h-10' : 'w-5 h-5';
  return (
    <div className={`relative ${box} rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-200 shrink-0`}>
      <Brain className={`${icon} text-white`} />
      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow">
        <Plus className="w-3 h-3 text-teal-600" strokeWidth={3} />
      </div>
    </div>
  );
}

function Wordmark({ size = 'md' }) {
  const cls = size === 'lg' ? 'text-3xl' : 'text-lg';
  return (
    <span className={`${cls} font-bold tracking-tight`}>
      <span className="text-slate-900">Health</span><span className="text-teal-600">AI</span>
    </span>
  );
}

export default function App() {
  const [role, setRole] = useState('patient');
  const [step, setStep] = useState('welcome');
  const [draft, setDraft] = useState(emptyDraft());
  const [search, setSearch] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  const [result, setResult] = useState(null);
  const [queueInfo, setQueueInfo] = useState(null);
  const [cases, setCases] = useState([]);
  const [expandedNurse, setExpandedNurse] = useState(null);
  const [expandedDoctor, setExpandedDoctor] = useState(null);
  const [nurseNotes, setNurseNotes] = useState({});

  const toggleSymptom = (id) => {
    setDraft(d => ({
      ...d,
      symptoms: d.symptoms.includes(id) ? d.symptoms.filter(s => s !== id) : [...d.symptoms, id],
    }));
  };

  const filteredSymptoms = SYMPTOMS.filter(s => s.label.includes(search.trim()));

  const runAnalysis = async () => {
    setAnalyzing(true);
    setAnalyzeError('');
    try {
      const symptomLabels = draft.symptoms.map(id => SYMPTOMS.find(s => s.id === id)?.label).join(', ');
      const stomachDetail = draft.symptoms.includes('stomach')
        ? `ตำแหน่งที่ปวด: ${draft.region || 'ไม่ระบุ'}, ลักษณะการปวด: ${draft.character || 'ไม่ระบุ'}`
        : 'ไม่มีอาการปวดท้อง';
      const prompt = [
        'คุณเป็นระบบผู้ช่วยเรียบเรียงและสรุปอาการของผู้ป่วยสำหรับโรงพยาบาล',
        'หน้าที่ของคุณคือจัดข้อมูลที่ผู้ป่วยแจ้งให้เป็นสรุปที่อ่านง่ายและกระชับสำหรับพยาบาล',
        'ห้ามวินิจฉัยโรค ห้ามประเมินความเสี่ยงหรือความรุนแรง ห้ามเดาชื่อโรค ให้สรุปเฉพาะสิ่งที่ผู้ป่วยแจ้งเท่านั้น',
        'ตอบกลับเป็น JSON เท่านั้น ห้ามมีข้อความอื่นใดนอกเหนือจาก JSON และห้ามใส่ backtick',
        '',
        'ข้อมูลผู้ป่วย:',
        `- อายุ: ${draft.age || 'ไม่ระบุ'} ปี`,
        `- เพศ: ${draft.sex}`,
        `- อาการ: ${symptomLabels || 'ไม่ระบุ'}`,
        `- ${stomachDetail}`,
        `- ระยะเวลาที่มีอาการ: ${draft.duration || 'ไม่ระบุ'}`,
        `- หมายเหตุเพิ่มเติมจากผู้ป่วย: ${draft.notes || '-'}`,
        '',
        'ตอบกลับเป็น JSON รูปแบบนี้เท่านั้น (key เป็นภาษาอังกฤษ ค่าเป็นภาษาไทย):',
        '{"chiefComplaint":"สรุปอาการสำคัญแบบกระชับ 1 บรรทัด รวมระยะเวลาที่เป็น","associatedSymptoms":"อาการร่วมอื่นๆ แบบสั้น เขียนว่า \\"ไม่มี\\" ถ้าไม่มีอาการร่วม"}',
      ].join('\n');

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await response.json();
      const textBlock = (data.content || []).find(b => b.type === 'text');
      if (!textBlock) throw new Error('empty response');
      const clean = textBlock.text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);

      parsed.chiefComplaint = parsed.chiefComplaint || symptomLabels || 'ไม่ระบุอาการ';
      parsed.associatedSymptoms = parsed.associatedSymptoms || 'ไม่มี';

      setResult(parsed);
      setStep('results');
    } catch (e) {
      setAnalyzeError('ไม่สามารถสรุปข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
      setStep('symptoms');
    } finally {
      setAnalyzing(false);
    }
  };

  const startAnalysis = () => {
    setStep('analyzing');
    runAnalysis();
  };

  const submitQueue = () => {
    const id = cases.length + 1;
    const newCase = {
      id,
      name: draft.name || 'ไม่ระบุชื่อ',
      age: draft.age,
      sex: draft.sex,
      symptoms: draft.symptoms.map(sid => SYMPTOMS.find(s => s.id === sid)?.label).join(', '),
      duration: draft.duration,
      notes: draft.notes,
      result,
      status: 'pending_nurse',
      nurseNote: '',
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    };
    setCases(cs => [...cs, newCase]);
    setQueueInfo({ id, wait: (cases.length + 1) * 10 });
    setStep('queued');
  };

  const resetPatientFlow = () => {
    setDraft(emptyDraft());
    setResult(null);
    setQueueInfo(null);
    setAnalyzeError('');
    setStep('welcome');
  };

  const confirmToDoctor = (id) => {
    setCases(cs => cs.map(c => (c.id === id ? { ...c, status: 'pending_doctor', nurseNote: nurseNotes[id] || '' } : c)));
    setExpandedNurse(null);
  };

  const completeCase = (id) => {
    setCases(cs => cs.map(c => (c.id === id ? { ...c, status: 'completed' } : c)));
    setExpandedDoctor(null);
  };

  const nursePending = cases.filter(c => c.status === 'pending_nurse');
  const forwarded = cases.filter(c => c.status === 'pending_doctor' || c.status === 'completed');
  const doctorPending = cases.filter(c => c.status === 'pending_doctor').sort((a, b) => a.id - b.id);
  const completed = cases.filter(c => c.status === 'completed');

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-white text-slate-900">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className={`mx-auto px-4 py-3 flex items-center justify-between ${role === 'patient' ? 'max-w-md' : 'max-w-2xl'}`}>
          <div className="flex items-center gap-2">
            <Logo />
            <Wordmark />
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1">
            {[
              { id: 'patient', Icon: User, label: 'ผู้ป่วย' },
              { id: 'nurse', Icon: Users, label: 'พยาบาล' },
              { id: 'doctor', Icon: Stethoscope, label: 'แพทย์' },
            ].map(r => (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition ${role === r.id ? 'bg-white shadow text-teal-700' : 'text-slate-500'}`}
              >
                <r.Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{r.label}</span>
              </button>
            ))}
          </div>
        </div>
        <p className="text-center text-[11px] text-slate-400 pb-1.5">โหมดสาธิต — สลับมุมมองเพื่อดูขั้นตอนการทำงานทั้งระบบ</p>
      </header>

      {role === 'patient' && (
        <main className="max-w-md mx-auto px-4 py-6 pb-16">
          {step === 'welcome' && (
            <div className="flex flex-col items-center text-center pt-10">
              <Logo size="lg" />
              <div className="mt-5"><Wordmark size="lg" /></div>
              <p className="mt-3 text-slate-600">สรุปอาการเบื้องต้นด้วย AI ก่อนพบแพทย์</p>
              <p className="text-xs text-slate-400 mt-1">AI-powered symptom summary assistant</p>
              <p className="text-sm text-slate-500 mt-6 leading-relaxed">
                ใช้เวลาไม่ถึง 3 นาที ช่วยให้พยาบาลและแพทย์เตรียมพร้อมก่อนตรวจจริง
              </p>
              <button
                onClick={() => setStep('info')}
                className="mt-8 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3.5 rounded-2xl transition shadow-lg shadow-blue-200"
              >
                เริ่มการประเมิน
              </button>
            </div>
          )}

          {step === 'info' && (
            <div>
              <h2 className="text-lg font-semibold mb-1">ข้อมูลเบื้องต้น</h2>
              <p className="text-sm text-slate-500 mb-5">ใช้สำหรับติดต่อและประกอบการสรุปอาการ</p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-600 mb-1 block">ชื่อ-นามสกุล</label>
                  <input
                    value={draft.name}
                    onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                    placeholder="เช่น สมชาย ใจดี"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-sm text-slate-600 mb-1 block">อายุ</label>
                    <input
                      value={draft.age}
                      onChange={e => setDraft(d => ({ ...d, age: e.target.value.replace(/[^0-9]/g, '') }))}
                      placeholder="20"
                      inputMode="numeric"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm text-slate-600 mb-1 block">เพศ</label>
                    <select
                      value={draft.sex}
                      onChange={e => setDraft(d => ({ ...d, sex: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 bg-white"
                    >
                      <option>ชาย</option>
                      <option>หญิง</option>
                      <option>อื่นๆ</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => setStep('welcome')} className="px-4 py-3.5 rounded-2xl border border-slate-200 text-slate-500">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button
                  disabled={!draft.name || !draft.age}
                  onClick={() => setStep('symptoms')}
                  className="flex-1 bg-blue-600 disabled:bg-slate-200 disabled:text-slate-400 hover:bg-blue-700 text-white font-medium py-3.5 rounded-2xl transition"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          )}

          {step === 'symptoms' && (
            <div>
              <h2 className="text-lg font-semibold mb-1">เลือกอาการที่คุณเป็น</h2>
              <p className="text-sm text-slate-500 mb-4">เลือกได้มากกว่า 1 อาการ</p>

              <div className="relative mb-4">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="ค้นหาอาการ"
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {filteredSymptoms.map(s => {
                  const selected = draft.symptoms.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggleSymptom(s.id)}
                      className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 transition ${selected ? 'bg-teal-600 border-teal-600 text-white shadow-md shadow-teal-200' : 'bg-white border-slate-200 text-slate-700 hover:border-teal-300'}`}
                    >
                      {selected && <CheckCircle className="absolute top-2 right-2 w-4 h-4" />}
                      <s.Icon className={`w-6 h-6 ${selected ? 'text-white' : 'text-teal-600'}`} />
                      <span className="text-sm font-medium">{s.label}</span>
                    </button>
                  );
                })}
              </div>

              {draft.symptoms.includes('stomach') && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50/50 p-4">
                  <p className="font-medium text-red-700 mb-3 text-sm">รายละเอียดอาการปวดท้อง</p>
                  <p className="text-xs text-slate-500 mb-2">ระบุตำแหน่งที่ปวด</p>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {REGIONS.map(r => (
                      <button
                        key={r}
                        onClick={() => setDraft(d => ({ ...d, region: r }))}
                        className={`py-2.5 rounded-xl border text-xs font-medium transition ${draft.region === r ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200'}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mb-2">ลักษณะการปวด</p>
                  <div className="flex gap-2 flex-wrap">
                    {CHARACTERS.map(c => (
                      <button
                        key={c}
                        onClick={() => setDraft(d => ({ ...d, character: c }))}
                        className={`px-4 py-2 rounded-full text-sm border transition ${draft.character === c ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200'}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5">
                <label className="text-sm text-slate-600 mb-1 block">มีอาการมานานเท่าไหร่</label>
                <input
                  value={draft.duration}
                  onChange={e => setDraft(d => ({ ...d, duration: e.target.value }))}
                  placeholder="เช่น 2 ชั่วโมง, 3 วัน"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
              </div>

              <div className="mt-4">
                <label className="text-sm text-slate-600 mb-1 block">อาการอื่นๆ เพิ่มเติม (ถ้ามี)</label>
                <textarea
                  value={draft.notes}
                  onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
                  placeholder="พิมพ์รายละเอียดเพิ่มเติม..."
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 resize-none"
                />
              </div>

              {analyzeError && (
                <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{analyzeError}</p>
              )}

              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep('info')} className="px-4 py-3.5 rounded-2xl border border-slate-200 text-slate-500">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button
                  disabled={draft.symptoms.length === 0}
                  onClick={startAnalysis}
                  className="flex-1 bg-blue-600 disabled:bg-slate-200 disabled:text-slate-400 hover:bg-blue-700 text-white font-medium py-3.5 rounded-2xl transition"
                >
                  สรุปอาการด้วย AI
                </button>
              </div>
            </div>
          )}

          {step === 'analyzing' && (
            <div className="flex flex-col items-center justify-center text-center pt-24">
              <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
              <p className="mt-5 font-medium">กำลังสรุปข้อมูลด้วย AI...</p>
              <p className="text-sm text-slate-400 mt-1">กรุณารอสักครู่</p>
            </div>
          )}

          {step === 'results' && result && (
            <div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm text-slate-500">สรุปอาการ</p>
                  <button
                    onClick={() => setStep('info')}
                    className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700"
                  >
                    <Pencil className="w-3.5 h-3.5" /> แก้ไข
                  </button>
                </div>
                <p className="text-sm">
                  <span className="text-slate-400">ชื่อ:</span> {draft.name} &nbsp;
                  <span className="text-slate-400">อายุ:</span> {draft.age} &nbsp;
                  <span className="text-slate-400">เพศ:</span> {draft.sex}
                </p>
                <p className="text-sm mt-1"><span className="text-slate-400">อาการสำคัญ:</span> {result.chiefComplaint}</p>
                <p className="text-sm mt-1"><span className="text-slate-400">อาการร่วม:</span> {result.associatedSymptoms}</p>
              </div>

              <p className="text-xs text-slate-400 flex items-start gap-1.5 mt-4">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                สรุปนี้จัดเรียงโดย AI จากข้อมูลที่คุณให้ไว้ พยาบาลจะตรวจสอบอีกครั้งก่อนพบแพทย์
              </p>

              <div className="mt-5">
                <button onClick={submitQueue} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3.5 rounded-2xl transition">
                  <Send className="w-4 h-4" /> ส่งข้อมูลและจองคิว
                </button>
              </div>
            </div>
          )}

          {step === 'queued' && queueInfo && (
            <div className="flex flex-col items-center text-center pt-16">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="mt-5 text-slate-500">ส่งข้อมูลเรียบร้อยแล้ว</p>
              <p className="text-3xl font-bold mt-1">คิวที่ #{queueInfo.id}</p>
              <p className="text-sm text-slate-500 mt-3 flex items-center justify-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> รอพยาบาลตรวจสอบข้อมูล · เวลารอโดยประมาณ {queueInfo.wait} นาที
              </p>
              <button onClick={resetPatientFlow} className="mt-8 w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-600 font-medium py-3.5 rounded-2xl">
                <RefreshCw className="w-4 h-4" /> เริ่มประเมินผู้ป่วยรายใหม่
              </button>
              <button onClick={() => setRole('nurse')} className="mt-3 text-sm text-teal-600 font-medium">
                ดูในมุมมองพยาบาล →
              </button>
            </div>
          )}
        </main>
      )}

      {role === 'nurse' && (
        <main className="max-w-2xl mx-auto px-4 py-6 pb-16">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-teal-600" />
              <h2 className="text-lg font-semibold">แดชบอร์ดพยาบาล</h2>
            </div>
            <span className="text-xs font-medium bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full">รอตรวจสอบ {nursePending.length} ราย</span>
          </div>

          {nursePending.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>ยังไม่มีเคสรอตรวจสอบ</p>
              <p className="text-sm mt-1">ลองส่งข้อมูลจากมุมมองผู้ป่วยเพื่อดูเคสที่นี่</p>
            </div>
          )}

          <div className="space-y-3">
            {nursePending.map(c => {
              const open = expandedNurse === c.id;
              return (
                <div key={c.id} className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                  <button onClick={() => setExpandedNurse(open ? null : c.id)} className="w-full flex items-center gap-3 p-4 text-left">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{c.name} <span className="text-slate-400 font-normal">· {c.age} ปี · {c.sex}</span></p>
                      <p className="text-sm text-slate-500 truncate">{c.result?.chiefComplaint}</p>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{c.time}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition shrink-0 ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && (
                    <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                      <p className="text-sm mb-1"><span className="text-slate-400">อาการ:</span> {c.symptoms}</p>
                      {c.duration && <p className="text-sm mb-1"><span className="text-slate-400">ระยะเวลา:</span> {c.duration}</p>}
                      {c.result?.associatedSymptoms && (
                        <p className="text-sm mb-1"><span className="text-slate-400">อาการร่วม:</span> {c.result.associatedSymptoms}</p>
                      )}
                      {c.notes && <p className="text-sm mb-1"><span className="text-slate-400">หมายเหตุจากผู้ป่วย:</span> {c.notes}</p>}
                      <textarea
                        value={nurseNotes[c.id] || ''}
                        onChange={e => setNurseNotes(n => ({ ...n, [c.id]: e.target.value }))}
                        placeholder="บันทึกจากพยาบาล (ถ้ามี)"
                        rows={2}
                        className="w-full mt-3 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 resize-none"
                      />
                      <button onClick={() => confirmToDoctor(c.id)} className="mt-3 w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 rounded-xl text-sm transition">
                        ยืนยันและส่งต่อแพทย์
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {forwarded.length > 0 && (
            <p className="text-xs text-slate-400 mt-6 text-center">ส่งต่อแพทย์แล้ว {forwarded.length} ราย</p>
          )}
        </main>
      )}

      {role === 'doctor' && (
        <main className="max-w-2xl mx-auto px-4 py-6 pb-16">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-teal-600" />
              <h2 className="text-lg font-semibold">แดชบอร์ดแพทย์</h2>
            </div>
            <span className="text-xs font-medium bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full">รอตรวจ {doctorPending.length} ราย</span>
          </div>

          {doctorPending.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <ShieldAlert className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>ยังไม่มีเคสที่พยาบาลส่งต่อ</p>
              <p className="text-sm mt-1">เคสจะปรากฏที่นี่หลังพยาบาลยืนยันข้อมูล</p>
            </div>
          )}

          <div className="space-y-3">
            {doctorPending.map(c => {
              const open = expandedDoctor === c.id;
              return (
                <div key={c.id} className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                  <button onClick={() => setExpandedDoctor(open ? null : c.id)} className="w-full flex items-center gap-3 p-4 text-left">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{c.name} <span className="text-slate-400 font-normal">· {c.age} ปี · {c.sex}</span></p>
                      <p className="text-sm text-slate-500 truncate">{c.result?.chiefComplaint}</p>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{c.time}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition shrink-0 ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && (
                    <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                      <p className="text-sm mb-1"><span className="text-slate-400">อาการ:</span> {c.symptoms}</p>
                      {c.duration && <p className="text-sm mb-1"><span className="text-slate-400">ระยะเวลา:</span> {c.duration}</p>}
                      {c.result?.associatedSymptoms && (
                        <p className="text-sm mb-1"><span className="text-slate-400">อาการร่วม:</span> {c.result.associatedSymptoms}</p>
                      )}
                      {c.notes && <p className="text-sm mb-1"><span className="text-slate-400">หมายเหตุจากผู้ป่วย:</span> {c.notes}</p>}
                      {c.nurseNote && (
                        <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-sm">
                          <span className="text-slate-400">บันทึกจากพยาบาล:</span> {c.nurseNote}
                        </div>
                      )}
                      <button onClick={() => completeCase(c.id)} className="mt-3 w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 rounded-xl text-sm transition">
                        เสร็จสิ้นการตรวจ
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {completed.length > 0 && (
            <p className="text-xs text-slate-400 mt-6 text-center">ตรวจเสร็จแล้ววันนี้ {completed.length} ราย</p>
          )}
        </main>
      )}
    </div>
  );
}
