let estudiantesGlobal = [];

function setupResultadosGenerales() {
    const cursoSelect = document.getElementById("cursoResultadosSelect");
    const tablaBody = document.querySelector("#tablaResultadosGenerales tbody");
    const seleccionRA = document.getElementById("seleccionEvaluaciones");
    const selectRA = document.querySelectorAll(".select-eva");
    const btnGenerar = document.getElementById("btnGenerarResultados");

    if (!cursoSelect || !tablaBody || !btnGenerar || !seleccionRA || selectRA.length === 0) {
        console.error("⚠️ No se encontraron elementos de Resultados Generales.");
        return;
    }

    // 1. Cargar cursos
    fetch("/api/cursos")
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                data.cursos.forEach(curso => {
                    const opt = document.createElement("option");
                    opt.value = curso.curso_id;
                    opt.textContent = curso.nombre_curso;
                    cursoSelect.appendChild(opt);
                });
            }
        });

    // 2. Al seleccionar curso → cargar evaluaciones disponibles por RA
    cursoSelect.addEventListener("change", () => {
        const cursoId = cursoSelect.value;
        tablaBody.innerHTML = "";
        if (!cursoId) return;
        seleccionRA.style.display = "none";

        fetch(`/api/evaluaciones-por-curso/${cursoId}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    selectRA.forEach(select => {
                        const ra = select.dataset.ra;
                        select.innerHTML = `<option value="">--</option>`;
                        data.evaluaciones
                            .filter(e => e.ra === ra)
                            .forEach(eva => {
                                const opt = document.createElement("option");
                                opt.value = eva.evaluacion_id;
                                opt.textContent = eva.nombre;
                                select.appendChild(opt);
                            });
                    });
                    seleccionRA.style.display = "block";
                }
            });
    });

    // 3. Generar tabla final de resultados por RA
    btnGenerar.addEventListener("click", () => {
        const cursoId = cursoSelect.value;
        if (!cursoId) return;

        const seleccionadas = {};
        let faltan = false;

        selectRA.forEach(select => {
            const ra = select.dataset.ra;
            const evaId = select.value;
            if (!evaId) faltan = true;
            else seleccionadas[ra] = evaId;
        });

        if (faltan) {
            alert("Selecciona una evaluación para cada Resultado de Aprendizaje.");
            return;
        }

        const estudiantesMap = new Map();
        let raProcesados = 0;
        
        Object.entries(seleccionadas).forEach(([ra, evaluacionId]) => {
            fetch(`/api/resultados-ra/${cursoId}/${evaluacionId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        data.resultados.forEach(res => {
                            const key = res.codigo_estudiante;
                            if (!estudiantesMap.has(key)) {
                                estudiantesMap.set(key, {
                                    nombre: res.nombre_estudiante,
                                    codigo: res.codigo_estudiante,
                                    resultados: {}
                                });
                            }
                            estudiantesMap.get(key).resultados[ra] = {
                                nivel: res.nivel_ra,
                                trazabilidad: res.trazabilidad || null
                            };
                        });
        
                        raProcesados++;
                        if (raProcesados === Object.keys(seleccionadas).length) {
                            renderTabla(Array.from(estudiantesMap.values()));
                            document.getElementById("exportButtons").style.display = "flex";
                            document.getElementById("btnVerGraficoRA").disabled = false;
                        }
                    }
                });
        });
    });
}
function renderTabla(estudiantes) {
    estudiantesGlobal = estudiantes;
    const tablaBody = document.querySelector("#tablaResultadosGenerales tbody");
    tablaBody.innerHTML = "";

    estudiantes.forEach((est, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${est.nombre}</td>
            <td>${est.codigo}</td>
            ${renderRA(est.resultados["Interiorización"], "Interiorización", est.codigo)}
            ${renderRA(est.resultados["Coordinación"], "Coordinación", est.codigo)}
            ${renderRA(est.resultados["Encapsulación"], "Encapsulación", est.codigo)}
            ${renderRA(est.resultados["Generalización"], "Generalización", est.codigo)}
        `;
        tablaBody.appendChild(tr);
    });
    
    document.querySelectorAll(".btn-expand-ra").forEach(btn => {
        btn.addEventListener("click", () => toggleExpandRA(btn));
    });
    
    tablaBody.addEventListener("click", (e) => {
        if (e.target.classList.contains("btn-detalle-ra")) {
            const ra = e.target.dataset.ra;
            const codigo = e.target.dataset.codigo;
            const row = e.target.closest("tr");
            const detalleRowId = `detalles-${codigo}-${ra}`;

            // Eliminar si ya existe
            const existente = document.getElementById(detalleRowId);
            if (existente) {
                existente.remove();
                return;
            }

            const estudiante = estudiantesGlobal.find(e => String(e.codigo).trim() === String(codigo).trim());

            if (!estudiante) {
                alert("No se encontró el estudiante.");
                return;
            }
            
            const resultadoRA = estudiante.resultados?.[ra];
            if (!resultadoRA || !resultadoRA.trazabilidad) {
                console.warn("Trazabilidad no encontrada para:", estudiante, ra);
                alert(`No se encontró trazabilidad para ${ra} del estudiante ${estudiante.nombre}.`);
                return;
            }
            const traz = estudiante.resultados[ra].trazabilidad;
            mostrarModalDetallesRA(estudiante, ra, traz);
            
            
        }
    });
}
function toggleExpandRA(btn) {
    const ra = btn.dataset.ra;
    const expanded = btn.textContent === "−";

    const thRA = btn.closest("th");
    const indexRA = Array.from(thRA.parentNode.children).indexOf(thRA);

    if (expanded) {
        btn.textContent = "+";
        removeExtraColumns(ra);
    } else {
        btn.textContent = "−";
        addExtraColumns(ra, indexRA);
    }
}
function extraerDetallesRA(trazabilidad) {
    if (!trazabilidad) return {
        puntajeTotal: null,
        criterios: [],
        indicadores: []
    };

    const criterios = Object.entries(trazabilidad.criterios || {}).map(([clave, info]) => ({
        clave,
        nombre: info.nombre,
        nivel: info.nivel,
        puntaje: info.puntaje,
        maximo: info.maximo
    }));

    const indicadores = Object.entries(trazabilidad.indicadores || {}).map(([clave, info]) => ({
        clave,
        nombre: info.nombre,
        nivel: info.nivel,
        puntaje: info.puntaje,
        maximo: info.maximo
    }));

    return {
        puntajeTotal: {
            valor: trazabilidad.resultado?.puntaje || 0,
            maximo: trazabilidad.resultado?.maximo || 0,
            nivel: trazabilidad.resultado?.nivel || "-"
        },
        criterios,
        indicadores
    };
}
function addExtraColumns(ra, startIndex) {
    const headerRow = document.getElementById("fila-titulos");
    if (!headerRow) return;

    // Recolectar nombres únicos desde la trazabilidad real
    const criteriosMap = new Map();
    const indicadoresMap = new Map();

    estudiantesGlobal.forEach(est => {
        const traz = est.resultados?.[ra]?.trazabilidad;
        const detalles = extraerDetallesRA(traz);

        detalles.criterios.forEach(c => {
            if (!criteriosMap.has(c.clave)) criteriosMap.set(c.clave, c.nombre);
        });

        detalles.indicadores.forEach(i => {
            if (!indicadoresMap.has(i.clave)) indicadoresMap.set(i.clave, i.nombre);
        });
    });

    const criteriosKeys = Array.from(criteriosMap.keys());
    const indicadoresKeys = Array.from(indicadoresMap.keys());

    // Puntaje Total
    const thTotal = document.createElement("th");
    thTotal.textContent = "Puntaje Total";
    thTotal.classList.add("extra-col");
    thTotal.dataset.ra = ra;
    const refTotal = headerRow.children[startIndex + 1];
    headerRow.insertBefore(thTotal, refTotal || null);

    // Encabezados de criterios
    criteriosKeys.forEach((clave, i) => {
        const th = document.createElement("th");
        th.innerHTML = `<small>${criteriosMap.get(clave)}</small>`;
        th.classList.add("extra-col");
        th.dataset.ra = ra;
        const ref = headerRow.children[startIndex + 2 + i];
        headerRow.insertBefore(th, ref || null);
    });

    // Encabezados de indicadores
    indicadoresKeys.forEach((clave, i) => {
        const th = document.createElement("th");
        th.innerHTML = `<small>${indicadoresMap.get(clave)}</small>`;
        th.classList.add("extra-col");
        th.dataset.ra = ra;
        const ref = headerRow.children[startIndex + 2 + criteriosKeys.length + i];
        headerRow.insertBefore(th, ref || null);
    });

    // Procesar cada fila de estudiante
    const filas = document.querySelectorAll("#tablaResultadosGenerales tbody tr");
    filas.forEach(fila => {
        // Aquí usamos el valor de la columna 3, que es el código del estudiante
        const codigoEstudiante = fila.children[2].textContent.trim();
        // Se busca el estudiante comparando con la propiedad "codigo"
        const estudiante = estudiantesGlobal.find(e => String(e.codigo).trim() === String(codigoEstudiante).trim());
        if (!estudiante) {
            console.warn(`No se encontró estudiante para el codigo ${codigoEstudiante}`);
            return;
        }
        const traz = estudiante.resultados?.[ra]?.trazabilidad;
        const detalles = extraerDetallesRA(traz);

        // Puntaje total
        const tdTotal = document.createElement("td");
        tdTotal.classList.add("extra-col");
        tdTotal.dataset.ra = ra;
        tdTotal.innerHTML = detalles.puntajeTotal
            ? `${detalles.puntajeTotal.valor}/${detalles.puntajeTotal.maximo} <br><strong>${detalles.puntajeTotal.nivel}</strong>`
            : "-";
        fila.insertBefore(tdTotal, fila.children[startIndex + 1] || null);

        // Criterios
        criteriosKeys.forEach((clave, i) => {
            const td = document.createElement("td");
            td.classList.add("extra-col");
            td.dataset.ra = ra;

            const c = detalles.criterios.find(x => x.clave === clave);
            td.innerHTML = c
                ? `${c.nivel}<br>(${c.puntaje}/${c.maximo})`
                : "-";

            fila.insertBefore(td, fila.children[startIndex + 2 + i] || null);
        });

        // Indicadores
        indicadoresKeys.forEach((clave, i) => {
            const td = document.createElement("td");
            td.classList.add("extra-col");
            td.dataset.ra = ra;

            const iData = detalles.indicadores.find(x => x.clave === clave);
            td.innerHTML = iData
                ? `${iData.nivel}<br>(${iData.puntaje}/${iData.maximo})`
                : "-";

            fila.insertBefore(td, fila.children[startIndex + 2 + criteriosKeys.length + i] || null);
        });
    });
}

function removeExtraColumns(ra) {
    // Encabezados
    const headerRow = document.getElementById("fila-titulos");
    const extras = [...headerRow.querySelectorAll(`.extra-col[data-ra="${ra}"]`)];
    extras.forEach(el => el.remove());

    // Filas
    const filas = document.querySelectorAll("#tablaResultadosGenerales tbody tr");
    filas.forEach(fila => {
        const tdExtras = [...fila.querySelectorAll(`.extra-col[data-ra="${ra}"]`)];
        tdExtras.forEach(td => td.remove());
    });
}

// 🔹 Función auxiliar para formatear el TD con clase de color
function renderRA(info, ra, codigo) {
    const nivel = info?.nivel || "-";
    const clase = nivel === "Avanzado" ? "nivel-avanzado"
                : nivel === "Intermedio" ? "nivel-intermedio"
                : nivel === "Básico" || nivel === "Basico" ? "nivel-bajo"
                : "nivel-desconocido";

    return `
        <td class="${clase}">
            ${nivel}
            ${info?.trazabilidad ? `<button class="btn-detalle-ra" data-ra="${ra}" data-codigo="${codigo}" title="Ver detalles" aria-hidden="true" style="margin-left:5px; cursor:pointer;">👁️</button>` : ""}
        </td>
    `;
}
function mostrarModalDetallesRA(estudiante, ra, traz) {
    const modal = document.getElementById("modalVerDetallesRA");
    const contenedor = document.getElementById("contenedorDetallesRA");
    const cerrarBtn = document.getElementById("btnCerrarModalDetallesRA");

    contenedor.innerHTML = `
        <p><strong>Estudiante:</strong> ${estudiante.nombre}</p>
        <p><strong>Resultado:</strong> ${ra}</p>
        <p><strong>Puntaje Total:</strong> ${traz.resultado.puntaje}/${traz.resultado.maximo} - Nivel: ${traz.resultado.nivel}</p>
        <br>
        <strong>Criterios:</strong>
        <ul>
            ${Object.entries(traz.criterios || {}).map(([id, info]) =>
                `<li><b>${info.nombre  }</b>: ${info.nivel} (${info.puntaje}/${info.maximo})</li>`
            ).join("")}
        </ul>
        <strong>Indicadores:</strong>
        <ul>
            ${Object.entries(traz.indicadores || {}).map(([id, info]) =>
                `<li><b>${info.nombre }</b>: ${info.nivel} (${info.puntaje}/${info.maximo})</li>`
            ).join("")}
        </ul>
    `;

    modal.classList.add("mostrar");

    // Cierre del modal dentro de la misma función
    cerrarBtn.onclick = () => {
        modal.classList.remove("mostrar");
    };
}
//graficos
function setupGraficoRA() {
    const btnGrafico = document.getElementById("btnVerGraficoRA");
    const modalGrafico = document.getElementById("modalGraficoRA");
    const cerrarModal = document.getElementById("btnCerrarGraficoRA");
    const selectRA = document.getElementById("selectGraficoRA");
    const tipoGrafico = document.getElementById("tipoGraficoRA");
    const graficoDiv = document.getElementById("graficoBoxplotRA");
    const cursoSelect = document.getElementById("cursoResultadosSelect");

    const contenedorRA = document.getElementById("selectRAContainer");
    const contenedorModoBarras = document.getElementById("modoAgrupacionContainer");
    const contenedorModoRadar = document.getElementById("modoRadarContainer");
    const contenedorEstudianteRadar = document.getElementById("selectEstudianteContainer");

    const modoBarrasNivel = document.getElementById("modoBarrasNivel");
    const modoRadar = document.getElementById("modoRadar");
    const selectEstudianteRadar = document.getElementById("selectEstudianteRadar");
    const btnPDF = document.getElementById("btnDescargarGrafico");

    // 📌 Cuando se cambia el modo de agrupación de barras
    modoBarrasNivel.addEventListener("change", () => {
        selectRA.value = "";
        graficoDiv.innerHTML = "";
    });

    // 📌 Cuando se cambia el modo de radar
    modoRadar.addEventListener("change", () => {
        selectRA.value = "";
        graficoDiv.innerHTML = "";
        const modo = modoRadar.value;
        contenedorEstudianteRadar.style.display = (modo === "estudiante") ? "block" : "none";
    });

    // 📌 Cuando se selecciona un estudiante (para radar o barras_estudiante)
    selectEstudianteRadar.addEventListener("change", async () => {
        const tipo = tipoGrafico.value;
        const ra = selectRA.value;
        const cursoId = cursoSelect.value;
        const codigo = selectEstudianteRadar.value;

        if (tipo === "radar" && ra && cursoId) {
            await renderRadarRA(ra, cursoId);
        }

        if (tipo === "barras_estudiante" && codigo && cursoId) {
            await renderBarrasPorEstudianteRA(cursoId, codigo);
        }
    });

    // 📌 Abrir modal
    btnGrafico.addEventListener("click", () => {
        tipoGrafico.value = "";
        selectRA.value = "";
        selectEstudianteRadar.value = "";
        graficoDiv.innerHTML = "";

        contenedorRA.style.display = "none";
        contenedorModoBarras.style.display = "none";
        contenedorModoRadar.style.display = "none";
        contenedorEstudianteRadar.style.display = "none";

        modalGrafico.classList.add("mostrar");

        // 🔄 Llenar estudiantes solo si está vacío
        const selectEst = document.getElementById("selectEstudianteRadar");
        if (selectEst.options.length <= 1 && estudiantesGlobal.length > 0) {
            estudiantesGlobal.forEach(e => {
                const opt = document.createElement("option");
                opt.value = e.codigo;
                opt.textContent = `${e.nombre} (${e.codigo})`;
                selectEst.appendChild(opt);
            });
        }
    });

    // 📌 Cerrar modal
    cerrarModal.addEventListener("click", () => {
        modalGrafico.classList.remove("mostrar");
    });

    // 📌 Cambio de tipo de gráfico
    tipoGrafico.addEventListener("change", () => {
        const tipo = tipoGrafico.value;

        // Reordenar visualmente los elementos dentro del modal
        
        const barraControles = document.getElementById("barraControlesGrafico");

        // Limpia y reordena las barras según el tipo de gráfico
        barraControles.innerHTML = "";
        
        barraControles.appendChild(tipoGrafico.parentElement); // siempre primero
        
        if (tipo === "barras_nivel") {
            barraControles.appendChild(contenedorModoBarras);
            barraControles.appendChild(contenedorRA);
        } else if (tipo === "radar") {
            if (modoRadar.value === "estudiante") {
                barraControles.appendChild(contenedorModoRadar);      // primero modo
                barraControles.appendChild(contenedorEstudianteRadar); // luego estudiante
                barraControles.appendChild(contenedorRA);              // después RA
            } else if (modoRadar.value === "grupo") {
                barraControles.appendChild(contenedorModoRadar);       // primero modo
                barraControles.appendChild(contenedorRA);              // luego RA
            }
        } else if (tipo === "barras_estudiante") {
            barraControles.appendChild(contenedorEstudianteRadar);
        } else if (["boxplot", "histograma"].includes(tipo)) {
            barraControles.appendChild(contenedorRA);
        }
        // Reinicios visuales
        selectRA.value = "";
        selectEstudianteRadar.value = "";
        graficoDiv.innerHTML = "";

        contenedorRA.style.display = ["boxplot", "histograma", "barras_nivel", "radar"].includes(tipo) ? "block" : "none";
        contenedorModoBarras.style.display = (tipo === "barras_nivel") ? "block" : "none";
        contenedorModoRadar.style.display = (tipo === "radar") ? "block" : "none";
        contenedorEstudianteRadar.style.display =
            (tipo === "radar" && modoRadar.value === "estudiante") || tipo === "barras_estudiante"
                ? "block"
                : "none";

        if (tipo === "barras_nivel") modoBarrasNivel.value = "ra";
        if (tipo === "radar") modoRadar.value = "grupo";

        if (tipo === "heatmap") {
            contenedorRA.style.display = "none";
            contenedorModoBarras.style.display = "none";
            contenedorModoRadar.style.display = "none";
            contenedorEstudianteRadar.style.display = "none";
            renderHeatmapRA();
        }
    });
    btnPDF.addEventListener("click", () => {
        descargarGraficoComoPDF();
    });

    // 📌 Selección del Resultado de Aprendizaje
    selectRA.addEventListener("change", async () => {
        const tipo = tipoGrafico.value;
        const ra = selectRA.value;
        const cursoId = cursoSelect.value;

        if (!cursoId || !ra) return;

        switch (tipo) {
            case "boxplot":
                await renderBoxplotRA(ra, cursoId);
                break;
            case "histograma":
                await renderHistogramaRA(ra, cursoId);
                break;
            case "barras_nivel":
                await renderBarrasNivelesRA(ra, cursoId);
                break;
            case "radar":
                await renderRadarRA(ra, cursoId);
                break;
        }
    });
}

function getEvaluacionId(ra) {
    const select = document.querySelector(`select.select-eva[data-ra="${ra}"]`);
    return select?.value || "";
}
async function renderBoxplotRA(ra, cursoId) {
    const evaluacionId = getEvaluacionId(ra);
    const graficoDiv = document.getElementById("graficoBoxplotRA");

    if (!evaluacionId) return alert("Selecciona una evaluación.");

    try {
        const res = await fetch(`/api/puntajes-ra-boxplot/${cursoId}/${evaluacionId}`);
        const data = await res.json();

        if (!data.success || data.puntajes.length === 0) return alert("No hay puntajes disponibles.");

        const trace = {
            y: data.puntajes,
            type: 'box',
            boxpoints: 'all',
            jitter: 0.5,
            pointpos: -1.8,
            marker: { color: '#007bff', size: 6 },
            line: { color: '#0056b3' },
            name: ra
        };

        const layout = {
            title: `Distribución de Puntajes - ${ra}`,
            yaxis: { title: 'Puntaje', zeroline: false },
            margin: { t: 40 }
        };

        Plotly.newPlot(graficoDiv, [trace], layout);

    } catch (err) {
        console.error("Error al generar boxplot:", err);
        alert("Error al generar el gráfico.");
    }
}
async function renderHistogramaRA(ra, cursoId) {
    const evaluacionId = getEvaluacionId(ra);
    const graficoDiv = document.getElementById("graficoBoxplotRA");

    if (!evaluacionId) return alert("Selecciona una evaluación.");

    try {
        const res = await fetch(`/api/puntajes-ra-boxplot/${cursoId}/${evaluacionId}`);
        const data = await res.json();

        if (!data.success || data.puntajes.length === 0) return alert("No hay puntajes disponibles.");

        const trace = {
            x: data.puntajes,
            type: 'histogram',
            marker: { color: '#007bff' },
            xbins: { start: 0, end: 100, size: 20 },
            name: ra
        };

        const layout = {
            title: `Frecuencia de Puntajes - ${ra}`,
            xaxis: { title: 'Rango de Puntaje', dtick: 20 },
            yaxis: { title: 'Cantidad de Estudiantes' },
            bargap: 0.05
        };

        Plotly.newPlot(graficoDiv, [trace], layout);

    } catch (err) {
        console.error("Error al generar histograma:", err);
        alert("Error al generar el gráfico.");
    }
}
async function renderBarrasNivelesRA(ra, cursoId) {
    const evaluacionId = getEvaluacionId(ra);
    const graficoDiv = document.getElementById("graficoBoxplotRA");
    const modo = document.getElementById("modoBarrasNivel").value;

    if (!evaluacionId) return alert("Selecciona una evaluación.");

    try {
        const res = await fetch(`/api/resultados-ra/${cursoId}/${evaluacionId}`);
        const data = await res.json();

        if (!data.success || !data.resultados || data.resultados.length === 0) {
            alert("No hay resultados disponibles.");
            return;
        }

        // 🔹 Modo 1: Agrupado por Resultado de Aprendizaje
        if (modo === "ra") {
            let contador = { Básico: 0, Intermedio: 0, Avanzado: 0 };

            data.resultados.forEach(est => {
                const nivel = est?.nivel_ra?.toLowerCase();
                if (nivel.includes("básico") || nivel.includes("basico")) contador.Básico++;
                else if (nivel.includes("intermedio")) contador.Intermedio++;
                else if (nivel.includes("avanzado")) contador.Avanzado++;
            });

            const trace = {
                x: ["Básico", "Intermedio", "Avanzado"],
                y: [contador.Básico, contador.Intermedio, contador.Avanzado],
                type: "bar",
                marker: { color: ["#ffcaca", "#fff4c2", "#c2ffd8"] }
            };

            const layout = {
                title: `Cantidad de Estudiantes por Nivel - ${ra}`,
                xaxis: { title: "Nivel de Logro" },
                yaxis: { title: "Cantidad de Estudiantes" },
                margin: { t: 40 }
            };

            Plotly.newPlot(graficoDiv, [trace], layout);
        }

        // 🔹 Modo 2: Agrupado por Criterio
        else if (modo === "criterio") {
            const criterios = {};

            data.resultados.forEach(est => {
                const traz = est.trazabilidad;
                if (!traz || !traz.criterios) return;

                for (const [clave, info] of Object.entries(traz.criterios)) {
                    if (!criterios[info.nombre]) {
                        criterios[info.nombre] = { Básico: 0, Intermedio: 0, Avanzado: 0 };
                    }

                    const nivel = info.nivel?.toLowerCase();
                    if (nivel.includes("básico") || nivel.includes("basico")) criterios[info.nombre].Básico++;
                    else if (nivel.includes("intermedio")) criterios[info.nombre].Intermedio++;
                    else if (nivel.includes("avanzado")) criterios[info.nombre].Avanzado++;
                }
            });

            const nombresCriterios = Object.keys(criterios);
            const basicoData = nombresCriterios.map(nombre => criterios[nombre].Básico);
            const intermedioData = nombresCriterios.map(nombre => criterios[nombre].Intermedio);
            const avanzadoData = nombresCriterios.map(nombre => criterios[nombre].Avanzado);

            const traceBasico = {
                x: nombresCriterios,
                y: basicoData,
                name: "Básico",
                type: "bar",
                marker: { color: "#ffcaca" }
            };

            const traceIntermedio = {
                x: nombresCriterios,
                y: intermedioData,
                name: "Intermedio",
                type: "bar",
                marker: { color: "#fff4c2" }
            };

            const traceAvanzado = {
                x: nombresCriterios,
                y: avanzadoData,
                name: "Avanzado",
                type: "bar",
                marker: { color: "#c2ffd8" }
            };

            const layout = {
                barmode: "stack",
                title: `Niveles por Criterio - ${ra}`,
                xaxis: { title: "Criterio" },
                yaxis: { title: "Cantidad de Estudiantes" },
                margin: { t: 40 }
            };

            Plotly.newPlot(graficoDiv, [traceBasico, traceIntermedio, traceAvanzado], layout);
        }

    } catch (err) {
        console.error("Error al generar gráfico de barras por nivel:", err);
        alert("Error al generar el gráfico.");
    }
}
async function renderRadarRA(ra, cursoId) {
    const evaluacionId = getEvaluacionId(ra);
    const modo = document.getElementById("modoRadar").value;
    const graficoDiv = document.getElementById("graficoBoxplotRA");

    if (!evaluacionId) return alert("Selecciona una evaluación.");

    try {
        // 📊 MODO GRUPO → Promedios por criterio
        if (modo === "grupo") {
            const res = await fetch(`/api/resultados-ra/${cursoId}/${evaluacionId}`);
            const data = await res.json();

            if (!data.success || !data.resultados || data.resultados.length === 0) {
                alert("No hay resultados disponibles.");
                return;
            }

            const niveles = { "básico": 1, "intermedio": 2, "avanzado": 3 };
            const criterios = {};

            data.resultados.forEach(est => {
                const traz = est?.trazabilidad;
                if (!traz || !traz.criterios) return;

                for (const [id, info] of Object.entries(traz.criterios)) {
                    const nombre = info.nombre;
                    const nivel = info.nivel?.toLowerCase();

                    if (!criterios[nombre]) criterios[nombre] = { total: 0, count: 0 };

                    if (niveles[nivel]) {
                        criterios[nombre].total += niveles[nivel];
                        criterios[nombre].count++;
                    }
                }
            });

            const nombres = Object.keys(criterios);
            const valores = nombres.map(n => {
                const c = criterios[n];
                return c.count > 0 ? (c.total / c.count).toFixed(2) : 0;
            });

            const trace = {
                type: "scatterpolar",
                r: valores,
                theta: nombres,
                fill: "toself",
                name: "Grupo",
                line: { color: "#1a73e8" }
            };

            const layout = {
                polar: {
                    radialaxis: {
                        visible: true,
                        range: [0, 3],
                        tickvals: [1, 2, 3],
                        ticktext: ["Básico", "Intermedio", "Avanzado"]
                    }
                },
                title: `Promedio por Criterio - ${ra}`,
                showlegend: false
            };

            Plotly.newPlot(graficoDiv, [trace], layout);
        }

        // 👤 MODO ESTUDIANTE → Desempeño individual por criterio
        if (modo === "estudiante") {
            const codigo = document.getElementById("selectEstudianteRadar").value;
            const estudiante = estudiantesGlobal.find(e => String(e.codigo).trim() === String(codigo).trim());
            

            const traz = estudiante.resultados[ra].trazabilidad;
            const detalles = extraerDetallesRA(traz);

            if (!detalles.criterios || detalles.criterios.length === 0) {
                return alert("No hay criterios para graficar en este RA.");
            }

            const nombres = detalles.criterios.map(c => c.nombre);
            const valores = detalles.criterios.map(c => {
                if (c.nivel?.toLowerCase().includes("básico")) return 1;
                if (c.nivel?.toLowerCase().includes("intermedio")) return 2;
                if (c.nivel?.toLowerCase().includes("avanzado")) return 3;
                return 0;
            });

            const trace = {
                type: "scatterpolar",
                r: valores,
                theta: nombres,
                fill: "toself",
                name: estudiante.nombre,
                line: { color: "#5333ed" }
            };

            const layout = {
                polar: {
                    radialaxis: {
                        visible: true,
                        range: [0, 3],
                        tickvals: [1, 2, 3],
                        ticktext: ["Básico", "Intermedio", "Avanzado"]
                    }
                },
                title: `Desempeño de ${estudiante.nombre} - ${ra}`,
                showlegend: false
            };

            Plotly.newPlot(graficoDiv, [trace], layout);
        }

        // 🔄 Cargar estudiantes en dropdown solo una vez
        const selectEst = document.getElementById("selectEstudianteRadar");
        if (selectEst.options.length <= 1 && estudiantesGlobal.length > 0) {
            estudiantesGlobal.forEach(e => {
                const opt = document.createElement("option");
                opt.value = e.codigo;
                opt.textContent = `${e.nombre} (${e.codigo})`;
                selectEst.appendChild(opt);
            });
        }

    } catch (err) {
        console.error("Error al generar radar:", err);
        alert("Error al generar el gráfico.");
    }
}
async function renderBarrasPorEstudianteRA(cursoId, codigoEstudiante) {
    const graficoDiv = document.getElementById("graficoBoxplotRA");
    const niveles = { "básico": 1, "intermedio": 2, "avanzado": 3 };
    const colores = { 1: "#ffcaca", 2: "#fff4c2", 3: "#c2ffd8" };

    try {
        const estudiante = estudiantesGlobal.find(e => String(e.codigo).trim() === String(codigoEstudiante).trim());

        if (!estudiante || !estudiante.resultados) {
            return alert("No se encontraron resultados para este estudiante.");
        }

        const raLabels = [];
        const raValues = [];
        const raColors = [];

        for (const [ra, info] of Object.entries(estudiante.resultados)) {
            const nivelTexto = info?.nivel?.toLowerCase();
            const valor = niveles[nivelTexto] || 0;
            if (valor > 0) {
                raLabels.push(ra);
                raValues.push(valor);
                raColors.push(colores[valor]);
            }
        }

        if (raLabels.length === 0) {
            return alert("Este estudiante no tiene niveles asignados.");
        }

        const trace = {
            x: raLabels,
            y: raValues,
            type: "bar",
            marker: { color: raColors },
            text: raValues.map(v =>
                v === 1 ? "Básico" : v === 2 ? "Intermedio" : "Avanzado"
            ),
            textposition: "auto",
            hoverinfo: "text"
        };

        const layout = {
            title: `Niveles por RA - ${estudiante.nombre}`,
            xaxis: { title: "Resultado de Aprendizaje" },
            yaxis: {
                title: "Nivel",
                tickvals: [1, 2, 3],
                ticktext: ["Básico", "Intermedio", "Avanzado"],
                range: [0, 3.5]
            },
            margin: { t: 40 }
        };

        Plotly.newPlot(graficoDiv, [trace], layout);

    } catch (err) {
        console.error("Error al generar gráfico de barras por estudiante:", err);
        alert("Error al generar el gráfico.");
    }
}
async function renderHeatmapRA() {
    const graficoDiv = document.getElementById("graficoBoxplotRA");

    if (!estudiantesGlobal || estudiantesGlobal.length === 0) {
        return alert("Primero debes generar resultados para ver el heatmap.");
    }

    const niveles = { "básico": 1, "intermedio": 2, "avanzado": 3 };
    const raList = ["Interiorización", "Coordinación", "Encapsulación", "Generalización"];

    const zData = [];
    const nombres = [];

    estudiantesGlobal.forEach(est => {
        const fila = [];
        raList.forEach(ra => {
            const nivelTexto = est.resultados?.[ra]?.nivel?.toLowerCase() || "";
            const valor = niveles[nivelTexto] || 0;
            fila.push(valor);
        });
        zData.push(fila);
        nombres.push(est.nombre);
    });

    const layout = {
        title: "Mapa de Calor por Estudiante y RA",
        xaxis: {
            title: "Resultados de Aprendizaje",
            tickvals: [0, 1, 2, 3],
            ticktext: raList
        },
        yaxis: {
            title: "Estudiantes",
            tickvals: nombres.map((_, i) => i),
            ticktext: nombres
        },
        margin: { t: 40 }
    };

    const data = [{
        z: zData,
        x: raList,
        y: nombres,
        type: "heatmap",
        colorscale: [
            [0, '#eeeeee'],       // Sin nivel (gris)
            [0.33, '#ffcaca'],    // Básico
            [0.66, '#fff4c2'],    // Intermedio
            [1.0, '#c2ffd8']      // Avanzado
        ],
        hoverongaps: false
    }];

    Plotly.newPlot(graficoDiv, data, layout);
}



//descarga 
function cargarImagenComoBase64(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous"; // importante si estás en desarrollo local
        img.onload = function () {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = function () {
            reject("❌ Error al cargar la imagen.");
        };
        img.src = url;
    });
}

async function exportarResultadosPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'pt', 'a4');
    const cursoSelect = document.getElementById("cursoResultadosSelect");
    const cursoNombre = cursoSelect.options[cursoSelect.selectedIndex]?.text || "Curso";

    const evaluaciones = {};
    document.querySelectorAll(".select-eva").forEach(sel => {
        const ra = sel.dataset.ra;
        const val = sel.options[sel.selectedIndex]?.text || "--";
        evaluaciones[ra] = val;
    });
    // 🔹 Cargar el logo como base64
    let logoBase64 = "";
    try {
        logoBase64 = await cargarImagenComoBase64("/public/images/logoApp.png");
        doc.addImage(logoBase64, 'PNG', doc.internal.pageSize.width - 130, 30, 80, 80); // ajusta posición y tamaño
    } catch (err) {
        console.warn("⚠️ No se pudo cargar el logo:", err);
    }

    // HEADER
    doc.setFontSize(14);
    doc.text(" Resultados por Curso", 40, 40);
    doc.setFontSize(10);
    doc.text(` Fecha: ${new Date().toLocaleDateString()}`, 40, 60);
    doc.text(` Curso: ${cursoNombre}`, 40, 80);

    let yOffset = 100;
    for (let ra in evaluaciones) {
        doc.text(`${ra}: ${evaluaciones[ra]}`, 40, yOffset);
        yOffset += 15;
    }

    const tabla = document.getElementById("tablaResultadosGenerales");
    const rows = [];

    // LIMPIADOR
    const limpiarTexto = (txt) =>
        txt.replace(/Ø|→|Ü|Ú|👁️|🔍|📘|📈|📊|undefined/g, "").replace(/\s+/g, " ").trim();

    // ENCABEZADOS
    const headers = [];
    tabla.querySelectorAll("thead tr").forEach((tr, idx) => {
        const cols = [];
        tr.querySelectorAll("th").forEach(th => {
            cols.push({ content: limpiarTexto(th.innerText), styles: { halign: 'center' } });
        });
        if (idx === 0) headers.push(cols);
    });

    // FILAS con colores por nivel
    tabla.querySelectorAll("tbody tr").forEach(tr => {
        const fila = [];
        tr.querySelectorAll("td").forEach(td => {
            const txt = limpiarTexto(td.innerText);
            const nivel = txt.toLowerCase();

            let fillColor = null;
            if (nivel.includes("avanzado")) fillColor = [194, 255, 216];
            else if (nivel.includes("intermedio")) fillColor = [255, 244, 194];
            else if (nivel.includes("básico") || nivel.includes("basico")) fillColor = [255, 202, 202];

            fila.push({
                content: txt || " ",
                styles: {
                    halign: 'center',
                    fillColor: fillColor || null
                }
            });
        });
        rows.push(fila);
    });

    doc.autoTable({
        head: headers,
        body: rows,
        startY: yOffset + 10,
        styles: {
            fontSize: 8,
            cellPadding: 4,
            valign: 'middle'
        },
        headStyles: {
            fillColor: [83, 51, 237],
            textColor: 255,
            fontStyle: 'bold'
        },
        alternateRowStyles: {
            fillColor: [250, 250, 250]
        },
        tableLineColor: [200, 200, 200],
        tableLineWidth: 0.1,
        didDrawPage: function (data) {
            // ---------- PIE DE PÁGINA ----------
            const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
            doc.setFontSize(9);
            doc.setTextColor(150);
            doc.text("Generado por MINDPC - Plataforma de Evaluación", doc.internal.pageSize.width - 40, pageHeight - 10, {
                align: 'right'
            });
        }
    });

    doc.save(`Resultados_${cursoNombre.replace(/\s+/g, "_")}.pdf`);
}

function exportarResultadosExcel() {
    const tabla = document.getElementById("tablaResultadosGenerales");
    const tablaClon = tabla.cloneNode(true);
    const cursoSelect = document.getElementById("cursoResultadosSelect");
    const cursoNombre = cursoSelect.options[cursoSelect.selectedIndex]?.text || "Curso";

    const limpiarTexto = (txt) =>
        txt.replace(/Ø|→|Ü|Ú|👁️|🔍|📘|📈|📊|undefined/g, "").replace(/\s+/g, " ").trim();

    tablaClon.querySelectorAll("th, td").forEach(cell => {
        cell.textContent = limpiarTexto(cell.textContent);
    });

    const ws = XLSX.utils.table_to_sheet(tablaClon);

    // Aplica bordes y negrilla a encabezados
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const headerCell = XLSX.utils.encode_cell({ r: 0, c: C });
        if (ws[headerCell]) {
            ws[headerCell].s = {
                font: { bold: true },
                border: {
                    top: { style: "thin", color: { rgb: "000000" } },
                    bottom: { style: "thin", color: { rgb: "000000" } },
                    left: { style: "thin", color: { rgb: "000000" } },
                    right: { style: "thin", color: { rgb: "000000" } }
                }
            };
        }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resultados");
    XLSX.writeFile(wb, `Resultados_${cursoNombre.replace(/\s+/g, "_")}.xlsx`);
}

function setupExportButtons() {
    const btnExcel = document.getElementById("btnExportExcel");
    const btnPDF = document.getElementById("btnExportPDF");

    if (btnExcel) btnExcel.onclick = exportarResultadosExcel;
    if (btnPDF) btnPDF.onclick = exportarResultadosPDF;
}
async function descargarGraficoComoPDF() {
    const { jsPDF } = window.jspdf;
    const div = document.getElementById("graficoBoxplotRA");
    if (!div) {
        alert("No hay gráfico para exportar.");
        return;
    }

    try {
        const canvas = await html2canvas(div, {
            backgroundColor: "#ffffff"
        });

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
            orientation: "landscape",
            unit: "pt",
            format: "a4"
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        // 📌 ENCABEZADO (igual que exportarResultadosPDF)
        pdf.setFontSize(16);
        pdf.setTextColor(33, 37, 41);
        pdf.text(" MINDPC - Plataforma de Evaluación", 40, 40);
        pdf.setFontSize(11);
        const curso = document.getElementById("cursoResultadosSelect");
        const cursoNombre = curso?.selectedOptions[0]?.textContent || "N/A";
        pdf.text(`Curso: ${cursoNombre}`, 40, 60);
        pdf.setDrawColor(200);
        pdf.line(40, 70, pageWidth - 40, 70);

        // 📊 GRÁFICO como imagen
        const imgWidth = pageWidth - 80;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", 40, 80, imgWidth, imgHeight);

        // 📎 PIE DE PÁGINA
        const fecha = new Date();
        const fechaTexto = fecha.toLocaleDateString();
        const horaTexto = fecha.toLocaleTimeString();
        pdf.setFontSize(9);
        pdf.setTextColor(100);
        pdf.text("Generado por MINDPC - Plataforma de Evaluación", 40, pageHeight - 30);
        pdf.text(`Fecha: ${fechaTexto} - Hora: ${horaTexto}`, 40, pageHeight - 18);

        // 💾 GUARDAR
        pdf.save("grafico_resultado.pdf");
    } catch (error) {
        console.error("❌ Error al exportar el gráfico:", error);
        alert("Ocurrió un error al generar el PDF del gráfico.");
    }
}

