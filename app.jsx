/* @jsx React.createElement */
const { useEffect, useMemo, useState } = React;

/**
 * GymEC PRO – Single-file React app (BETA v3)
 *
 * Cambios pedidos:
 * - UX/Registro: autocompletar último peso/reps, editar/borrar registros guardados,
 *   duplicar rápido, plantillas por grupo con 1 toque.
 * - Análisis: gráfico de progresión por ejercicio (sparkline SVG),
 *   volumen semanal/mensual con barras, PR badges y banderas de estancamiento (28 días sin PR).
 * - Filtros: selector de Grupo muscular filtra ejercicios, Full Body muestra todos,
 *   buscador de ejercicios.
 * - Marca: renombrado a "GymEC PRO" y copy limpio.
 */

// ====== Persistencia ======
const KEY = "gymlog_pro_v1"; // conservamos la misma clave para no perder datos previos

// ====== Catálogo de ejercicios (según tu listado) ======
const catalog = {
  Pecho: [
    "Banca apertura de pectoral",
    "Rack prensa pectoral",
    "Hammer Pec declinado",
    "Hammer Pec Plano",
    "Hammer Pec Inclinado",
    "Press Banca barra",
    "Multi press plano",
    "Estacion Poleas",
    "Mancuernas",
  ],
  Espalda: [
    "Remo tendido",
    "Jalon al pecho polea",
    "Remo de pie asistido 45º",
    "Remo T con apoyo",
    "Remo T plataforma",
    "Remo Dorian",
    "Remo Alto",
    "Pull Over maquina",
    "Banco Rumano",
    "Remo Bajo con tipo hammer",
    "Pull down cruzado",
    "Maquina lumbar",
    "Remo polea baja",
    "Estacion Poleas",
    "Mancuernas",
  ],
  Piernas: [
    "Patada de gluteos",
    "Dual Aductores y abductores",
    "Sentadilla Pendulo",
    "Maquina pata de gluteos",
    "Hack sentado",
    "Power squat pro",
    "Soleo sentado",
    "Hip Thrust vertical",
    "Curl femoral tendido",
    "Curl femoral sentado",
    "Curl femoral parado",
    "Prensa pendular",
    "Sissy squat",
    "Maquina Squat lunge",
    "Maquina sentadilla apalancada",
    "Maquina Hack invertida femorales",
    "Multi Hip",
    "Hip Thrust horizontal",
    "Extension de cuadriceps",
    "Belt Squat",
    "Tibial anterior",
    "Sentadilla Hack",
    "Prensa horizontal",
    "Estacion Poleas",
    "Mancuernas",
  ],
  Hombros: [
    "Vuelo lateral y posterior",
    "Vuelo lateral sentado maquina",
    "Hammer press militar 90º",
    "Press Militar maquina 45º",
    "Estacion Poleas",
    "Mancuernas",
  ],
  Brazos: [
    "Curl predicador V",
    "Maquina Triceps sentado",
    "Fondos sentado",
    "Estacion Poleas",
    "Mancuernas",
  ],
};
const GROUPS = ["Pecho", "Espalda", "Piernas", "Hombros", "Brazos", "Full Body", "Otros"];

function allExercises() {
  return Array.from(new Set([
    ...catalog.Pecho,
    ...catalog.Espalda,
    ...catalog.Piernas,
    ...catalog.Hombros,
    ...catalog.Brazos,
  ]));
}

// ====== Utils ======
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function loadDB() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { sessions: [], exercises: allExercises() };
    const data = JSON.parse(raw);
    return {
      sessions: Array.isArray(data.sessions) ? data.sessions : [],
      exercises: Array.isArray(data.exercises) && data.exercises.length ? data.exercises : allExercises(),
    };
  } catch {
    return { sessions: [], exercises: allExercises() };
  }
}
function saveDB(db) {
  localStorage.setItem(KEY, JSON.stringify(db));
}
function toCSV(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v) => `"${String(v ?? "").replaceAll("\"", '""')}"`;
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(headers.map((h) => escape(r[h])).join(","));
  return lines.join("\n");
}

// ====== UI Primitives ======
function Section({ title, children, right }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        {right}
      </div>
      <div className="rounded-2xl p-4 shadow bg-white">{children}</div>
    </div>
  );
}
function Pill({ children, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={
        "px-3 py-1 rounded-full text-sm mr-2 mb-2 border " +
        (active ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50 border-gray-300")
      }
    >
      {children}
    </button>
  );
}
function Input({ label, type = "text", ...props }) {
  return (
    <label className="block mb-3">
      <span className="text-sm text-gray-600">{label}</span>
      <input
        type={type}
        {...props}
        className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/20"
      />
    </label>
  );
}
function Textarea({ label, ...props }) {
  return (
    <label className="block mb-3">
      <span className="text-sm text-gray-600">{label}</span>
      <textarea
        {...props}
        className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 h-24 focus:outline-none focus:ring-2 focus:ring-black/20"
      />
    </label>
  );
}
function Select({ label, options, value, onChange }) {
  return (
    <label className="block mb-3">
      <span className="text-sm text-gray-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-black/20"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

// ====== App ======
function App() {
  const [db, setDb] = useState(loadDB());
  const [date, setDate] = useState(todayStr());
  const [groupSel, setGroupSel] = useState("Pecho");
  const [exerciseSel, setExerciseSel] = useState(catalog.Pecho[0]);
  const [search, setSearch] = useState("");
  const [weight, setWeight] = useState("");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("8");
  const [notes, setNotes] = useState("");
  const [sessionItems, setSessionItems] = useState([]);
  const [filterExercise, setFilterExercise] = useState("");
  const [editId, setEditId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

  useEffect(() => saveDB(db), [db]);

  // ====== Lista de ejercicios por grupo + buscador ======
  const exerciseOptions = useMemo(() => {
    let list = [];
    if (groupSel === "Full Body") list = allExercises();
    else if (catalog[groupSel]) list = catalog[groupSel];
    else list = allExercises();
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.toLowerCase().includes(q));
    }
    // Extras del usuario (grupo "Otros")
    const extras = db.exercises.filter((x) => !allExercises().includes(x));
    if (groupSel === "Otros" && extras.length) list = [...list, ...extras];
    return Array.from(new Set(list));
  }, [groupSel, search, db.exercises]);

  // ====== Auto-completar último peso/reps al cambiar ejercicio ======
  useEffect(() => {
    const last = [...db.sessions]
      .filter((s) => s.exercise === exerciseSel)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (last) {
      setWeight(String(last.weight || ""));
      setReps(String(last.reps || "8"));
    }
  }, [exerciseSel, db.sessions]);

  // ====== PR helpers ======
  const getPR = (exercise) => {
    const arr = db.sessions.filter((s) => s.exercise === exercise);
    return arr.length ? Math.max(...arr.map((x) => Number(x.weight) || 0)) : 0;
  };
  const isStalled = (exercise) => {
    const arr = db.sessions.filter((s) => s.exercise === exercise);
    if (!arr.length) return false;
    const pr = getPR(exercise);
    const lastPR = arr
      .filter((s) => Number(s.weight) === pr)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const days = (Date.now() - new Date(lastPR.date).getTime()) / (1000 * 60 * 60 * 24);
    return days >= 28;
  };

  // ====== Acciones ======
  const addExerciseToLib = (name) => {
    if (!name || !name.trim()) return;
    if (!db.exercises.includes(name)) {
      const upd = { ...db, exercises: [...db.exercises, name].sort() };
      setDb(upd);
      setExerciseSel(name);
    }
  };
  const addItem = () => {
    if (!exerciseSel || !weight || !sets || !reps) return;
    const item = {
      id: uid(),
      date,
      group: groupSel,
      exercise: exerciseSel,
      weight: Number(weight),
      sets: Number(sets),
      reps: Number(reps),
      notes: notes.trim(),
      prCandidate: false,
    };
    const prevPR = getPR(item.exercise);
    if (item.weight > prevPR) item.prCandidate = true;
    setSessionItems((prev) => [item, ...prev]);
    setNotes("");
  };
  const duplicateItem = (id) => {
    const src = sessionItems.find((x) => x.id === id);
    if (!src) return;
    const copy = { ...src, id: uid() };
    setSessionItems((p) => [copy, ...p]);
  };
  const saveSession = () => {
    if (!sessionItems.length) return;
    const upd = { ...db, sessions: [...db.sessions, ...sessionItems] };
    setDb(upd);
    setSessionItems([]);
    const newPRs = sessionItems.filter((s) => s.prCandidate).length;
    alert(`Sesión guardada ✅${newPRs ? ` | ${newPRs} PR 🎉` : ""}`);
  };

  // Editar/Borrar registros guardados
  const startEdit = (row) => { setEditId(row.id); setEditDraft({ ...row }); };
  const cancelEdit = () => { setEditId(null); setEditDraft(null); };
  const confirmEdit = () => {
    setDb((prev) => ({
      ...prev,
      sessions: prev.sessions.map((r) => (r.id === editId ? { ...r, ...editDraft, weight: Number(editDraft.weight), sets: Number(editDraft.sets), reps: Number(editDraft.reps) } : r)),
    }));
    setEditId(null); setEditDraft(null);
  };
  const deleteSaved = (id) => {
    if (!confirm("¿Eliminar este registro?")) return;
    setDb((prev) => ({ ...prev, sessions: prev.sessions.filter((x) => x.id !== id) }));
  };

  // ====== Derivados ======
  const lastPRs = useMemo(() => {
    const map = new Map();
    [...db.sessions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach((s) => { if (!map.has(s.exercise)) map.set(s.exercise, s); });
    return Array.from(map.values()).sort((a, b) => a.exercise.localeCompare(b.exercise));
  }, [db.sessions]);

  const historyFiltered = useMemo(() => {
    if (!filterExercise) return [];
    return db.sessions
      .filter((s) => s.exercise === filterExercise)
      .sort((a, b) => new Date(a.date) - new Date(b.date)); // ascendente para sparkline
  }, [db.sessions, filterExercise]);

  // Volumen semanal y mensual (global)
  function weekKey(dStr) {
    const d = new Date(dStr);
    const onejan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${week}`;
  }
  const volumeBy = useMemo(() => {
    const weekly = {}; const monthly = {}; const byGroup = {};
    for (const s of db.sessions) {
      const vol = (Number(s.weight) || 0) * (Number(s.sets) || 0) * (Number(s.reps) || 0);
      const wk = weekKey(s.date); const mo = s.date.slice(0, 7);
      weekly[wk] = (weekly[wk] || 0) + vol;
      monthly[mo] = (monthly[mo] || 0) + vol;
      byGroup[s.group] = (byGroup[s.group] || 0) + vol;
    }
    const weeklyArr = Object.entries(weekly).sort((a, b) => (a[0] > b[0] ? 1 : -1));
    const monthlyArr = Object.entries(monthly).sort((a, b) => (a[0] > b[0] ? 1 : -1));
    const groupArr = Object.entries(byGroup).sort((a, b) => b[1] - a[1]);
    return { weeklyArr, monthlyArr, groupArr };
  }, [db.sessions]);

  // ====== Plantillas por grupo ======
  const templates = {
    Pecho: ["Press Banca barra", "Hammer Pec Plano", "Aperturas polea"],
    Espalda: ["Remo tendido", "Remo T con apoyo", "Jalon al pecho polea"],
    Piernas: ["Sentadilla Hack", "Extension de cuadriceps", "Curl femoral sentado"],
    Hombros: ["Hammer press militar 90º", "Vuelo lateral y posterior"],
    Brazos: ["Curl predicador V", "Maquina Triceps sentado"],
    "Full Body": ["Press Banca barra", "Remo tendido", "Sentadilla Hack"],
  };
  const loadTemplate = () => {
    const list = templates[groupSel] || [];
    if (!list.length) { alert("No hay plantilla para este grupo."); return; }
    const items = list.map((ex) => ({ id: uid(), date, group: groupSel, exercise: ex, weight: Number(weight) || 0, sets: Number(sets) || 3, reps: Number(reps) || 8, notes: "", prCandidate: false }));
    setSessionItems((p) => [...items, ...p]);
  };

  // ====== Render helpers ======
  const Sparkline = ({ data }) => {
    if (!data || data.length === 0) return <div className="text-sm text-gray-500">Sin datos</div>;
    const w = 260, h = 60, pad = 6;
    const xs = data.map((d, i) => i);
    const ys = data.map((d) => Number(d.weight) || 0);
    const xMax = xs[xs.length - 1] || 1;
    const yMin = Math.min(...ys), yMax = Math.max(...ys);
    const scaleX = (i) => pad + (w - pad * 2) * (i / (xMax || 1));
    const scaleY = (v) => {
      if (yMax === yMin) return h - pad;
      return h - pad - ((v - yMin) / (yMax - yMin)) * (h - pad * 2);
    };
    const points = data.map((d, i) => `${scaleX(i)},${scaleY(Number(d.weight) || 0)}`).join(" ");
    return (
      <svg width={w} height={h} className="block">
        <polyline fill="none" strokeWidth="2" stroke="currentColor" points={points} />
      </svg>
    );
  };

  const BarRow = ({ label, value, max }) => (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-gray-600"><span>{label}</span><span>{Intl.NumberFormat().format(Math.round(value))}</span></div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-2 bg-black" style={{ width: `${max ? (value / max) * 100 : 0}%` }} /></div>
    </div>
  );

  // ====== Volumen estimado hoy ======
  const volumeToday = useMemo(() => {
    const t = todayStr();
    return db.sessions
      .filter((s) => s.date === t)
      .reduce((acc, s) => acc + (Number(s.weight) || 0) * (Number(s.sets) || 0) * (Number(s.reps) || 0), 0);
  }, [db.sessions]);

  // ====== Compartir informe ======
  const shareDaily = async () => {
    const today = todayStr();
    const items = db.sessions.filter((s) => s.date === today);
    if (!items.length) { alert("No hay registros de hoy"); return; }
    const lines = [
      `Informe ${today}`,
      ...items.map((s) => `- ${s.group} · ${s.exercise}: ${s.weight} kg · ${s.sets}x${s.reps}${s.notes ? ` · ${s.notes}` : ""}`),
    ].join("\n");
    if (navigator.share) { try { await navigator.share({ title: `Informe ${today}`, text: lines }); } catch {} }
    else { await navigator.clipboard.writeText(lines); alert("Informe copiado al portapapeles ✅"); }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 pb-24">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">GymEC PRO</h1>
          <p className="text-gray-600">Registro de progresos</p>
        </div>
        <button onClick={loadTemplate} className="rounded-xl px-3 py-2 border">Cargar plantilla de {groupSel}</button>
      </header>

      {/* Registro rápido */}
      <Section title="Registrar ejercicio" right={<button onClick={saveSession} className="rounded-xl px-4 py-2 bg-black text-white">Guardar sesión</button>}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Select label="Grupo muscular" options={GROUPS} value={groupSel} onChange={(v) => { setGroupSel(v); const list = v === "Full Body" ? allExercises() : catalog[v] || []; setExerciseSel((list && list[0]) || exerciseSel); }} />
          <Input label="Buscar ejercicio" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." />
          <Select label="Ejercicio" options={exerciseOptions} value={exerciseSel} onChange={setExerciseSel} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input label="Peso (kg)" type="number" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
          <Input label="Series" type="number" value={sets} onChange={(e) => setSets(e.target.value)} />
          <Input label="Reps" type="number" value={reps} onChange={(e) => setReps(e.target.value)} />
        </div>
        <Textarea label="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={addItem} className="rounded-xl px-4 py-2 bg-gray-900 text-white">Añadir a la sesión</button>
          <button onClick={() => addExerciseToLib(prompt("Nuevo ejercicio:") || "")} className="rounded-xl px-4 py-2 border">+ Añadir ejercicio a la librería</button>
          {sessionItems.length > 0 && <span className="text-sm text-gray-600">Items en esta sesión: {sessionItems.length}</span>}
        </div>
        {sessionItems.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Ejercicios en esta sesión</h3>
            <ul className="divide-y">
              {sessionItems.map((s) => (
                <li key={s.id} className="py-2 grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
                  <div className="col-span-2"><span className="font-medium">{s.exercise}</span> · {s.group} {s.prCandidate && <span className="ml-2 inline-block text-xs bg-yellow-200 px-2 py-0.5 rounded-full">PR candidato 🎯</span>}</div>
                  <div>{s.weight} kg</div>
                  <div>{s.sets}x{s.reps}</div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => duplicateItem(s.id)} className="text-xs px-2 py-1 rounded border">Duplicar</button>
                    <button onClick={() => setSessionItems((prev) => prev.filter((i) => i.id !== s.id))} className="text-xs px-2 py-1 rounded border border-red-600 text-red-600">Eliminar</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {/* Últimas marcas y gestión de registros */}
      <Section title="Últimas marcas (por ejercicio)" right={<button onClick={() => { const csv = toCSV(db.sessions); const blob = new Blob([csv], { type: "text/csv" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "gymlog_export.csv"; a.click(); URL.revokeObjectURL(url); }} className="rounded-xl px-4 py-2 border">Exportar CSV</button>}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Ejercicio</th>
                <th>Fecha</th>
                <th>Peso</th>
                <th>Series×Reps</th>
                <th>Notas</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lastPRs.map((s) => {
                const pr = getPR(s.exercise);
                const stalled = isStalled(s.exercise);
                const isEditing = editId === s.id;
                return (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{s.exercise}</td>
                    <td>{isEditing ? <input className="border rounded px-2 py-1 text-sm" value={editDraft.date} onChange={(e)=> setEditDraft({...editDraft, date: e.target.value})} /> : s.date}</td>
                    <td>{isEditing ? <input type="number" className="border rounded px-2 py-1 text-sm w-24" value={editDraft.weight} onChange={(e)=> setEditDraft({...editDraft, weight: e.target.value})} /> : `${s.weight} kg`}</td>
                    <td>{isEditing ? (<div className="flex gap-2"><input type="number" className="border rounded px-2 py-1 text-sm w-16" value={editDraft.sets} onChange={(e)=> setEditDraft({...editDraft, sets: e.target.value})} /><input type="number" className="border rounded px-2 py-1 text-sm w-16" value={editDraft.reps} onChange={(e)=> setEditDraft({...editDraft, reps: e.target.value})} /></div>) : `${s.sets}×${s.reps}`}</td>
                    <td>{isEditing ? <input className="border rounded px-2 py-1 text-sm w-48" value={editDraft.notes} onChange={(e)=> setEditDraft({...editDraft, notes: e.target.value})} /> : <span className="text-gray-600">{s.notes}</span>}</td>
                    <td>
                      {Number(s.weight) >= pr && pr>0 && <span className="inline-block text-xs bg-amber-200 px-2 py-0.5 rounded-full mr-1">PR 🏆</span>}
                      {stalled && <span className="inline-block text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Estancado ⚠️</span>}
                    </td>
                    <td className="space-x-1">
                      {isEditing ? (
                        <>
                          <button onClick={confirmEdit} className="text-xs px-2 py-1 rounded border">Guardar</button>
                          <button onClick={cancelEdit} className="text-xs px-2 py-1 rounded border">Cancelar</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(s)} className="text-xs px-2 py-1 rounded border">Editar</button>
                          <button onClick={() => deleteSaved(s.id)} className="text-xs px-2 py-1 rounded border border-red-600 text-red-600">Eliminar</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-sm text-gray-600">Tip: usa "Buscar ejercicio" para acotar el selector, y duplica series similares con un toque.</div>
      </Section>

      {/* Historial por ejercicio + Sparkline */}
      <Section title="Historial por ejercicio">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select label="Elegir ejercicio" options={["", ...allExercises(), ...db.exercises.filter(x=>!allExercises().includes(x))]} value={filterExercise} onChange={setFilterExercise} />
          <div>
            <label className="text-sm text-gray-600">(Opcional) Importar CSV</label>
            <input type="file" accept=".csv" onChange={(e) => { const file = e.target.files?.[0]; if(!file) return; const reader = new FileReader(); reader.onload = () => { try { const text = String(reader.result||""); const lines = text.trim().split(/\\r?\\n/); const headers=(lines.shift()||"").split(",").map(h=>h.replaceAll('"','')); const rows = lines.map(l=>{ const cells=l.split(","); const obj={}; headers.forEach((h,i)=> obj[h]= (cells[i]||"").replaceAll('"','')); return obj;}); const cleaned = rows.map(r=>({ id:r.id||uid(), date:r.date||todayStr(), group:r.group||'Otros', exercise:r.exercise||'', weight:Number(r.weight||0), sets:Number(r.sets||0), reps:Number(r.reps||0), notes:r.notes||''})).filter(r=> r.exercise); setDb(prev=> ({...prev, sessions:[...prev.sessions, ...cleaned]})); alert(`Importadas ${cleaned.length} filas ✅`); } catch { alert("Error al importar CSV"); } }; reader.readAsText(file); }} className="block mt-1" />
          </div>
        </div>

        {filterExercise && (
          <div className="mt-4">
            <div className="mb-2 text-sm text-gray-700 flex items-center gap-2">
              <span className="font-semibold">Progresión:</span> <Sparkline data={historyFiltered} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">Fecha</th>
                    <th>Peso</th>
                    <th>Series×Reps</th>
                    <th>Grupo</th>
                    <th>Notas</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {historyFiltered.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-2">{s.date}</td>
                      <td>{s.weight} kg</td>
                      <td>{s.sets}×{s.reps}</td>
                      <td>{s.group}</td>
                      <td className="text-gray-600">{s.notes}</td>
                      <td>
                        <button onClick={() => deleteSaved(s.id)} className="text-xs px-2 py-1 rounded border border-red-600 text-red-600">Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Section>

      {/* Análisis: Volumen semanal/mensual + por grupo */}
      <Section title="Análisis de Volumen">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Semanal</h3>
            {(() => {
              const max = Math.max(1, ...volumeBy.weeklyArr.map(([,v])=>v));
              return volumeBy.weeklyArr.slice(-8).map(([k,v]) => <BarRow key={k} label={k} value={v} max={max} />);
            })()}
          </div>
          <div>
            <h3 className="font-semibold mb-2">Mensual</h3>
            {(() => {
              const max = Math.max(1, ...volumeBy.monthlyArr.map(([,v])=>v));
              return volumeBy.monthlyArr.slice(-6).map(([k,v]) => <BarRow key={k} label={k} value={v} max={max} />);
            })()}
          </div>
        </div>
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Por grupo (acumulado)</h3>
          {(() => {
            const max = Math.max(1, ...volumeBy.groupArr.map(([,v])=>v));
            return volumeBy.groupArr.map(([k,v]) => <BarRow key={k} label={k} value={v} max={max} />);
          })()}
        </div>
      </Section>

      {/* Informe del día */}
      <Section title="Informe del día" right={<button onClick={shareDaily} className="rounded-xl px-4 py-2 border">Compartir</button>}>
        <div className="text-sm text-gray-700">Volumen hoy (peso×series×reps): <span className="font-semibold ml-2">{Intl.NumberFormat().format(volumeToday)} kg</span></div>
      </Section>

      <footer className="text-center text-xs text-gray-500 mt-8">Hecho para Miguel · Guarda localmente · Exporta para respaldo</footer>
    </div>
  );
}

// Render
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
