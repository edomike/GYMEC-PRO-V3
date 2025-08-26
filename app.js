
const { useState, useEffect, useMemo } = React;

const KEY = "gymlog_pro_v1";

const defaultExercises = [
  "Remo máquina inclinada (espejo)",
  "Máquina amarilla",
  "Remo sentado cerrado",
  "Remo sentado unilateral",
  "Remo barra libre",
  "Remo T",
  "Remo mancuerna unilateral",
  "Remo negro espejo",
  "Dorsales polea",
  "Dorsal polea unilateral",
  "Dorsales máquina negra",
  "Dorsal máquina diagonal unilateral",
  "Dorsal sentado",
  "Jalón al pecho",
  "Pull over",
  "Face pull",
  "Sentadilla libre",
  "Péndulo",
  "Prensa inclinada",
  "Hacka",
  "Haka",
  "Peso muerto mancuernas",
  "Peso rumano unilateral",
  "Búlgaras",
  "Extensión cuádriceps",
  "Curl isquios sentado",
  "Curl isquios unilateral",
  "Pantorrillas",
  "Press plano barra",
  "Press mancuernas",
  "Press inclinado mancuernas",
  "Pec Deck",
  "Aperturas polea",
  "Máquina pecho",
  "Press máquina roja",
  "Press hombros mancuernas",
  "Máquina negra hombros",
  "Hombros laterales mancuernas",
  "Hombro posterior polea",
  "Hombros bilaterales mancuernas",
  "Hombro frontal mancuernas",
  "Hombros posteriores agachado",
  "Curl predicador",
  "Curl bayesian",
  "Curl martillo",
  "Tríceps rompe cráneos (barra Z)",
  "Tríceps press francés",
  "Tríceps polea V",
  "Tríceps máquina"
];

const groups = [
  "Espalda","Pecho","Piernas","Isquios","Hombros","Brazos","Full Body","Otros"
];

function uid(){ return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function todayStr(){
  const d = new Date();
  const pad = (n)=> String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function loadDB(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return { sessions: [], exercises: defaultExercises };
    const data = JSON.parse(raw);
    return {
      sessions: Array.isArray(data.sessions)? data.sessions : [],
      exercises: Array.isArray(data.exercises) && data.exercises.length? data.exercises : defaultExercises
    };
  }catch(e){ return { sessions: [], exercises: defaultExercises }; }
}
function saveDB(db){
  localStorage.setItem(KEY, JSON.stringify(db));
}
function toCSV(rows){
  if(!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v)=> `"${String(v ?? "").replaceAll('"','""')}"`;
  const lines = [headers.join(",")];
  for(const r of rows){ lines.push(headers.map(h=>escape(r[h])).join(",")); }
  return lines.join("\n");
}
function fromCSV(text){
  const lines = text.trim().split(/\r?\n/);
  const headers = (lines.shift()||"").split(",").map(h=>h.replaceAll('"',""));
  return lines.map(line=>{
    const cells=[]; let cur=""; let inQ=false;
    for(let i=0;i<line.length;i++){
      const ch=line[i];
      if(ch=='"'){ if(inQ && line[i+1]=='"'){ cur+='"'; i++; } else inQ=!inQ; }
      else if(ch=="," && !inQ){ cells.push(cur); cur=""; }
      else cur+=ch;
    }
    cells.push(cur);
    const obj={};
    headers.forEach((h,idx)=> obj[h] = (cells[idx]||"").replaceAll('"',""));
    return obj;
  });
}

function Section({title, children, right}){
  return React.createElement("div",{className:"mb-6"},
    React.createElement("div",{className:"flex items-center justify-between mb-2"},
      React.createElement("h2",{className:"text-xl font-semibold"}, title),
      right
    ),
    React.createElement("div",{className:"rounded-2xl p-4 shadow bg-white"}, children)
  );
}
function Pill({children,onClick,active}){
  return React.createElement("button",{
    onClick,
    className: "px-3 py-1 rounded-full text-sm mr-2 mb-2 border " + (active ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50 border-gray-300")
  }, children);
}
function Input({label,type="text",...props}){
  return React.createElement("label",{className:"block mb-3"},
    React.createElement("span",{className:"text-sm text-gray-600"},label),
    React.createElement("input",{type,...props,className:"mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/20"})
  );
}
function Textarea({label,...props}){
  return React.createElement("label",{className:"block mb-3"},
    React.createElement("span",{className:"text-sm text-gray-600"},label),
    React.createElement("textarea",{...props,className:"mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 h-24 focus:outline-none focus:ring-2 focus:ring-black/20"})
  );
}
function Select({label,options,value,onChange}){
  return React.createElement("label",{className:"block mb-3"},
    React.createElement("span",{className:"text-sm text-gray-600"},label),
    React.createElement("select",{value, onChange:(e)=>onChange(e.target.value), className:"mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-black/20"},
      options.map(o=> React.createElement("option",{key:o, value:o}, o))
    )
  );
}

function App(){
  const [db,setDb] = useState(loadDB());
  const [date,setDate] = useState(todayStr());
  const [groupSel,setGroupSel] = useState("Espalda");
  const [exerciseSel,setExerciseSel] = useState(defaultExercises[0]);
  const [weight,setWeight] = useState("");
  const [sets,setSets] = useState("3");
  const [reps,setReps] = useState("8");
  const [notes,setNotes] = useState("");
  const [sessionItems,setSessionItems] = useState([]);
  const [filterExercise,setFilterExercise] = useState("");

  useEffect(()=> saveDB(db), [db]);

  const addExerciseToLib = (name)=>{
    if(!name || !name.trim()) return;
    if(!db.exercises.includes(name)){
      const upd = { ...db, exercises: [...db.exercises, name].sort() };
      setDb(upd);
      setExerciseSel(name);
    }
  };

  const addItem = ()=>{
    if(!exerciseSel || !weight || !sets || !reps) return;
    const item = {
      id: uid(),
      date,
      group: groupSel,
      exercise: exerciseSel,
      weight: Number(weight),
      sets: Number(sets),
      reps: Number(reps),
      notes: (notes||"").trim(),
    };
    setSessionItems(prev=> [item, ...prev]);
    setWeight("");
    setReps("8");
    setNotes("");
  };

  const saveSession = ()=>{
    if(!sessionItems.length) return;
    const upd = { ...db, sessions: [...db.sessions, ...sessionItems] };
    setDb(upd);
    setSessionItems([]);
    alert("Sesión guardada ✅");
  };

  const lastPRs = useMemo(()=>{
    const map = new Map();
    [...db.sessions].sort((a,b)=> new Date(b.date)-new Date(a.date)).forEach(s=>{
      if(!map.has(s.exercise)) map.set(s.exercise, s);
    });
    return Array.from(map.values()).sort((a,b)=> a.exercise.localeCompare(b.exercise));
  }, [db.sessions]);

  const historyFiltered = useMemo(()=>{
    if(!filterExercise) return [];
    return db.sessions.filter(s=> s.exercise===filterExercise).sort((a,b)=> new Date(b.date)-new Date(a.date));
  }, [db.sessions, filterExercise]);

  const exportCSV = ()=>{
    const csv = toCSV(db.sessions);
    const blob = new Blob([csv], {type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "gymlog_export.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const importCSV = (file)=>{
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const rows = fromCSV(String(reader.result||""));
        const cleaned = rows.map(r=>({
          id: r.id || uid(),
          date: r.date || todayStr(),
          group: r.group || "Otros",
          exercise: r.exercise || "",
          weight: Number(r.weight || 0),
          sets: Number(r.sets || 0),
          reps: Number(r.reps || 0),
          notes: r.notes || ""
        })).filter(r=> r.exercise);
        const upd = { ...db, sessions: [...db.sessions, ...cleaned] };
        setDb(upd);
        alert(`Importadas ${cleaned.length} filas ✅`);
      }catch(e){ alert("Error al importar CSV"); }
    };
    reader.readAsText(file);
  };

  const shareDaily = async ()=>{
    const today = todayStr();
    const items = db.sessions.filter(s=> s.date===today);
    if(!items.length){ alert("No hay registros de hoy"); return; }
    const lines = [
      `Informe ${today}`,
      ...items.map(s=> `- ${s.group} · ${s.exercise}: ${s.weight} kg · ${s.sets}x${s.reps}${s.notes? ` · ${s.notes}`: ""}`)
    ].join("\\n");
    if(navigator.share){
      try{ await navigator.share({ title:`Informe ${today}`, text: lines }); }catch(e){}
    }else{
      navigator.clipboard.writeText(lines);
      alert("Informe copiado al portapapeles ✅");
    }
  };

  const volumeToday = useMemo(()=>{
    const t = todayStr();
    return db.sessions.filter(s=> s.date===t).reduce((acc,s)=> acc + s.weight*s.sets*s.reps, 0);
  }, [db.sessions]);

  const quickList = [
    "Máquina amarilla","Remo barra libre","Remo T","Dorsales polea","Sentadilla libre","Prensa inclinada","Hacka","Péndulo","Extensión cuádriceps","Curl isquios sentado","Curl isquios unilateral","Búlgaras","Press mancuernas","Press inclinado mancuernas","Aperturas polea","Pec Deck","Press hombros mancuernas","Máquina negra hombros","Curl predicador","Curl bayesian","Curl martillo","Tríceps polea V","Tríceps máquina","Pull over","Face pull"
  ];

  return React.createElement("div",{className:"max-w-3xl mx-auto p-4 pb-24"},
    React.createElement("header",{className:"mb-4"},
      React.createElement("h1",{className:"text-2xl font-bold"},"GymLog PRO"),
      React.createElement("p",{className:"text-gray-600"},"Registro de progresos – estilo Hany Rambod (FST-7 ready)")
    ),
    React.createElement(Section,{
      title:"Registrar ejercicio",
      right: React.createElement("button",{onClick:saveSession, className:"rounded-xl px-4 py-2 bg-black text-white"},"Guardar sesión")
    },
      React.createElement("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-3"},
        React.createElement(Input,{label:"Fecha", type:"date", value:date, onChange:(e)=>setDate(e.target.value)}),
        React.createElement(Select,{label:"Grupo muscular", options: groups, value: groupSel, onChange:setGroupSel}),
        React.createElement(Select,{label:"Ejercicio", options: Array.from(new Set(db.exercises)), value: exerciseSel, onChange:setExerciseSel})
      ),
      React.createElement("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-3"},
        React.createElement(Input,{label:"Peso (kg)", type:"number", inputMode:"decimal", value:weight, onChange:(e)=>setWeight(e.target.value)}),
        React.createElement(Input,{label:"Series", type:"number", value:sets, onChange:(e)=>setSets(e.target.value)}),
        React.createElement(Input,{label:"Reps", type:"number", value:reps, onChange:(e)=>setReps(e.target.value)})
      ),
      React.createElement(Textarea,{label:"Notas (opcional)", value:notes, onChange:(e)=>setNotes(e.target.value)}),
      React.createElement("div",{className:"flex items-center gap-2"},
        React.createElement("button",{onClick:()=>{
          if(!exerciseSel || !weight || !sets || !reps) return;
          const item = { id: uid(), date, group: groupSel, exercise: exerciseSel, weight: Number(weight), sets: Number(sets), reps: Number(reps), notes: (notes||'').trim() };
          setSessionItems(prev=> [item, ...prev]);
          setWeight(""); setReps("8"); setNotes("");
        }, className:"rounded-xl px-4 py-2 bg-gray-900 text-white"},"Añadir a la sesión"),
        React.createElement("button",{onClick:()=>{
          const name = prompt("Nuevo ejercicio:") || "";
          if(name.trim()) addExerciseToLib(name);
        }, className:"rounded-xl px-4 py-2 border"},"+ Añadir ejercicio a la librería")
      ),
      sessionItems.length>0 && React.createElement("div",{className:"mt-4"},
        React.createElement("h3",{className:"font-semibold mb-2"},"Ejercicios en esta sesión"),
        React.createElement("ul",{className:"divide-y"},
          sessionItems.map(s=> React.createElement("li",{key:s.id, className:"py-2 flex items-center justify-between"},
            React.createElement("span",null, `${s.exercise} · ${s.weight} kg · ${s.sets}x${s.reps}`),
            React.createElement("button",{onClick:()=> setSessionItems(prev=> prev.filter(i=> i.id!==s.id)), className:"text-sm text-red-600"},"Eliminar")
          ))
        )
      )
    ),
    React.createElement(Section,{title:"Acceso rápido a máquinas/usuales"},
      React.createElement("div",{className:"flex flex-wrap"},
        quickList.map(n=> React.createElement(Pill,{key:n, onClick:()=> setExerciseSel(n), active: exerciseSel===n}, n))
      )
    ),
    React.createElement(Section,{title:"Últimas marcas (por ejercicio)", right: React.createElement("button",{onClick:()=>{
      const csv = toCSV(db.sessions);
      const blob = new Blob([csv], {type:"text/csv"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href=url; a.download="gymlog_export.csv"; a.click();
      URL.revokeObjectURL(url);
    }, className:"rounded-xl px-4 py-2 border"},"Exportar CSV")},
      React.createElement("div",{className:"overflow-x-auto"},
        React.createElement("table",{className:"w-full text-sm"},
          React.createElement("thead",null,
            React.createElement("tr",{className:"text-left border-b"},
              React.createElement("th",{className:"py-2"},"Ejercicio"),
              React.createElement("th",null,"Fecha"),
              React.createElement("th",null,"Peso"),
              React.createElement("th",null,"Series×Reps"),
              React.createElement("th",null,"Notas")
            )
          ),
          React.createElement("tbody",null,
            lastPRs.map(s=> React.createElement("tr",{key:s.id, className:"border-b last:border-0"},
              React.createElement("td",{className:"py-2 font-medium"}, s.exercise),
              React.createElement("td",null, s.date),
              React.createElement("td",null, `${s.weight} kg`),
              React.createElement("td",null, `${s.sets}×${s.reps}`),
              React.createElement("td",{className:"text-gray-600"}, s.notes)
            ))
          )
        )
      ),
      React.createElement("div",{className:"mt-3 text-sm text-gray-600"},"Tip: toca un ejercicio en \"Acceso rápido\" y carga su dato arriba.")
    ),
    React.createElement(Section,{title:"Historial por ejercicio"},
      React.createElement("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-3"},
        React.createElement(Select,{label:"Elegir ejercicio", options: [""].concat(Array.from(new Set(db.exercises))), value: "", onChange: setFilterExercise}),
        React.createElement("div",null,
          React.createElement("label",{className:"text-sm text-gray-600"},"Importar CSV"),
          React.createElement("input",{type:"file", accept:".csv", onChange:(e)=>{
            const file = (e.target.files||[])[0]; if(file) importCSV(file);
          }, className:"block mt-1"})
        )
      ),
      filterExercise && React.createElement("div",{className:"overflow-x-auto"},
        React.createElement("table",{className:"w-full text-sm"},
          React.createElement("thead",null,
            React.createElement("tr",{className:"text-left border-b"},
              React.createElement("th",{className:"py-2"},"Fecha"),
              React.createElement("th",null,"Peso"),
              React.createElement("th",null,"Series×Reps"),
              React.createElement("th",null,"Grupo"),
              React.createElement("th",null,"Notas")
            )
          ),
          React.createElement("tbody",null,
            historyFiltered.map(s=> React.createElement("tr",{key:s.id, className:"border-b last:border-0"},
              React.createElement("td",{className:"py-2"}, s.date),
              React.createElement("td",null, `${s.weight} kg`),
              React.createElement("td",null, `${s.sets}×${s.reps}`),
              React.createElement("td",null, s.group),
              React.createElement("td",{className:"text-gray-600"}, s.notes)
            ))
          )
        )
      )
    ),
    React.createElement(Section,{title:"Informe del día", right: React.createElement("button",{onClick:()=>{
      const today = todayStr();
      const items = db.sessions.filter(s=> s.date===today);
      if(!items.length){ alert("No hay registros de hoy"); return; }
      const lines = [`Informe ${today}`].concat(items.map(s=> `- ${s.group} · ${s.exercise}: ${s.weight} kg · ${s.sets}x${s.reps}${s.notes? ` · ${s.notes}`: ""}`)).join("\\n");
      if(navigator.share){ navigator.share({title:`Informe ${today}`, text: lines}).catch(()=>{}); }
      else { navigator.clipboard.writeText(lines); alert("Informe copiado al portapapeles ✅"); }
    }, className:"rounded-xl px-4 py-2 border"},"Compartir")},
      React.createElement("div",{className:"text-sm text-gray-700"},
        "Volumen estimado hoy (peso×series×reps):",
        React.createElement("span",{className:"font-semibold ml-2"},
          Intl.NumberFormat().format(
            (function(){
              const t = todayStr();
              return db.sessions.filter(s=> s.date===t).reduce((acc,s)=> acc + s.weight*s.sets*s.reps, 0);
            })()
          ),
          " kg"
        )
      ),
      React.createElement("div",{className:"mt-3 text-sm text-gray-600"},"Pulsa \"Compartir\" para enviar el informe por WhatsApp u otra app.")
    ),
    React.createElement("footer",{className:"text-center text-xs text-gray-500 mt-8"},"Hecho para Miguel · Guarda localmente · Exporta para respaldo")
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
