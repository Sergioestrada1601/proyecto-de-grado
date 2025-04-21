let preguntasActuales = [];
document.addEventListener("DOMContentLoaded", () => {
    const evaluacionId = localStorage.getItem("evaluacionCreadaId");
    if (evaluacionId) {
        const select = document.getElementById("evaluacionSelect");
        if (select) {
            select.value = evaluacionId;
            select.dispatchEvent(new Event("change"));
        }
        localStorage.removeItem("evaluacionCreadaId");
    }
});

function setupEvaluacion() {
    console.log(" Configuración de Evaluación Iniciada.");

    const evaluacionSelect = document.getElementById("evaluacionSelect");
    const cursoSelect = document.getElementById("cursoSelect");
    const tablaEvaluacion = document.getElementById("evaluacionTabla");
    const tablaBody = tablaEvaluacion.getElementsByTagName("tbody")[0];
    const tablaHead = tablaEvaluacion.getElementsByTagName("thead")[0];

    let resultadoAprendizajeSeleccionado = null;
    const evaluacionId = localStorage.getItem("evaluacionCreadaId");
    if (evaluacionId) {
        const select = document.getElementById("evaluacionSelect");
        if (select) {
            select.value = evaluacionId;
            select.dispatchEvent(new Event("change"));
        }
        localStorage.removeItem("evaluacionCreadaId");
    }

    //  1. Cargar evaluaciones
    cargarEvaluaciones();

    //  2. Evento cuando se selecciona una evaluación
    evaluacionSelect.addEventListener("change", function () {
        const evaluacionId = evaluacionSelect.value;
        cursoSelect.disabled = !evaluacionId;
        const tipoEvaluacion = evaluacionSelect.options[evaluacionSelect.selectedIndex].getAttribute("data-tipo");
        const resultadoAprendizaje = evaluacionSelect.options[evaluacionSelect.selectedIndex].getAttribute("data-resultado");
        
        //  Limpiar tabla al cambiar de evaluación
        tablaBody.innerHTML = "";
        limpiarEncabezadosTabla();

        if (!evaluacionId) {
            console.warn(" No se seleccionó una evaluación.");
            cursoSelect.innerHTML = '<option value="">-- Seleccionar Curso --</option>';
            return;
        }

        const selectedOption = evaluacionSelect.options[evaluacionSelect.selectedIndex];
        resultadoAprendizajeSeleccionado = selectedOption.getAttribute("data-resultado");

        console.log(` Evaluación seleccionada con RA: ${resultadoAprendizajeSeleccionado}`);

        generarPreguntas(evaluacionId, tipoEvaluacion, resultadoAprendizaje);
        // Cargar cursos después de seleccionar una evaluación
        cargarCursos();
    });

    //  3. Cargar cursos disponibles después de seleccionar una evaluación
    function cargarCursos() {
        fetch("/api/cursos")
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    console.error(" Error al obtener cursos:", data.error);
                    return;
                }

                cursoSelect.innerHTML = '<option value="">-- Seleccionar Curso --</option>';
                data.cursos.forEach(curso => {
                    const option = document.createElement("option");
                    option.value = curso.curso_id;
                    option.textContent = curso.nombre_curso;
                    cursoSelect.appendChild(option);
                });
            })
            .catch(error => console.error(" Error al obtener cursos:", error));
    }

    //  4. Evento cuando se selecciona un curso
    cursoSelect.addEventListener("change", function () {
        const cursoId = cursoSelect.value;
        tablaBody.innerHTML = ""; // Limpiar la tabla

        if (!cursoId) {
            console.warn(" No se seleccionó un curso.");
            return;
        }

        console.log(` Cargando estudiantes del curso ${cursoId}...`);

        cargarEstudiantes(cursoId);
    });
    //  6. Generar preguntas en la tabla según la evaluacion
    function generarPreguntas(evaluacionId, tipoEvaluacion, resultadoAprendizaje) {
        if (!evaluacionId) return;
    
        let apiUrl = tipoEvaluacion === "usuario" 
            ? `/api/evaluacion-preguntas/${evaluacionId}` 
            : `/api/evaluacion-preguntas-base/${encodeURIComponent(resultadoAprendizaje)}`;
    
        console.log(` Cargando preguntas desde: ${apiUrl}`);
    
        fetch(apiUrl)
            .then(response => response.json())
            .then(data => {
                if (!data.success || data.preguntas.length === 0) {
                    console.warn(" No se encontraron preguntas asociadas a esta evaluación.");
                    preguntasActuales = []; // Resetear preguntas
                    return;
                }
    
                limpiarEncabezadosTabla();
    
                //  Guardar preguntas en la variable global
                preguntasActuales = data.preguntas;
    
                //  Agregar encabezados de preguntas
                let headerRow = tablaHead.querySelector("tr");
                preguntasActuales.forEach((pregunta, index) => {
                    let th = document.createElement("th");
                    th.textContent = `Pregunta ${index + 1}`;
                    headerRow.appendChild(th);
                });
    
                //  Agregar campos de entrada en cada fila de estudiantes
                tablaBody.querySelectorAll("tr").forEach(row => {
                    preguntasActuales.forEach(() => {
                        let td = document.createElement("td");
                        let input = document.createElement("input");
                        input.type = "number";
                        input.min = "0";
                        input.classList.add("respuesta");
                        td.appendChild(input);
                        row.appendChild(td);
                    });
                });
    
                console.log(" Preguntas generadas correctamente.");
            })
            .catch(error => console.error(" Error al cargar preguntas:", error));
    }
    //  7. Función para limpiar encabezados de preguntas en la tabla
    function limpiarEncabezadosTabla() {
        let headerRow = tablaHead.querySelector("tr");
        while (headerRow.cells.length > 4) {
            headerRow.deleteCell(4);
        }
    }
}
//cargar estudiantes 
function cargarEstudiantes(cursoId) {
    const tablaBody = document.getElementById("evaluacionTabla").getElementsByTagName("tbody")[0];
    const btnEliminarSeleccionados = document.getElementById("btnEliminarSeleccionados");

    fetch(`/api/estudiantes?curso_id=${cursoId}`)
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                console.error(" Error al obtener estudiantes:", data.error);
                return;
            }

            //  Limpiar la tabla antes de insertar nuevos datos
            tablaBody.innerHTML = "";

            if (data.estudiantes.length === 0) {
                alert("Este curso no tiene estudiantes registrados.");
                btnEliminarSeleccionados.disabled = true;
                return;
            }

            //  Insertar estudiantes en la tabla con opción de selección
            data.estudiantes.forEach((estudiante, index) => {
                const row = tablaBody.insertRow();
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td><input type="checkbox" class="seleccionar-estudiante" data-codigo="${estudiante.codigo_estudiante}"></td>
                    <td>${estudiante.nombre_estudiante}</td>
                    <td>${estudiante.codigo_estudiante}</td>
                `;
                preguntasActuales.forEach(() => {
                    let td = document.createElement("td");
                    let input = document.createElement("input");
                    input.type = "number";
                    input.min = "0";
                    input.classList.add("respuesta");
                    td.appendChild(input);
                    row.appendChild(td);
                });
            });
            

            //  Agregar eventos a los checkboxes para habilitar el botón de eliminación
            document.querySelectorAll(".seleccionar-estudiante").forEach(checkbox => {
                checkbox.addEventListener("change", function () {
                    const seleccionados = document.querySelectorAll(".seleccionar-estudiante:checked");
                    console.log("Estudiantes seleccionados:", seleccionados.length);
                    btnEliminarSeleccionados.disabled = seleccionados.length === 0;
                });
            });

            console.log(" Tabla de estudiantes actualizada.");
        })
        .catch(error => console.error(" Error al obtener los estudiantes:", error));
}
//cargar estudiantes despues del cvs
function cargarEstudiantes2(cursoId, evaluacionId) {
    const tablaEstudiantes = document.getElementById("evaluacionTabla");

    if (!tablaEstudiantes) {
        console.error(" No se encontró la tabla de estudiantes.");
        return;
    }

    // Obtener estudiantes con sus puntajes desde la base de datos
    fetch(`/api/puntajes/${cursoId}/${evaluacionId}`)
        .then(response => response.json())
        .then(data => {
            if (!data.success || !data.puntajes) {
                console.error(" No se encontraron puntajes para este curso y evaluación.");
                return;
            }

            const tbody = tablaEstudiantes.querySelector("tbody");
            tbody.innerHTML = ""; // Limpiar la tabla antes de llenarla

            data.puntajes.forEach((estudiante, index) => {
                const puntajes = JSON.parse(estudiante.puntajes);
                const fila = document.createElement("tr");

                fila.innerHTML = `
                    <td>${index + 1}</td>
                    <td><input type="checkbox"></td>
                    <td>${estudiante.nombre_estudiante}</td>
                    <td>${estudiante.codigo_estudiante}</td>
                    ${puntajes.map((p, i) => `<td><input type="number" value="${p}" class="puntaje-input" data-codigo="${estudiante.codigo_estudiante}" data-pregunta="${i + 1}"></td>`).join("")}
                `;

                tbody.appendChild(fila);
            });
        })
        .catch(error => console.error(" Error al cargar estudiantes con puntajes:", error));
}

function setupVerEvaluacion() {
    console.log(" Configuración de la Vista de Evaluación Iniciada.");

    const btnVerEvaluacion = document.getElementById("btnVerEvaluacion");
    const modalVerEvaluacion = document.getElementById("modalVerEvaluacion");
    const contenedorCriteriosVer = document.getElementById("contenedorCriteriosVer");
    const btnCerrarModalVer = document.getElementById("btnCerrarModalVer");
    const evaluacionSelect = document.getElementById("evaluacionSelect");

    //  Habilitar el botón cuando se seleccione una evaluación
    evaluacionSelect.addEventListener("change", function () {
        btnVerEvaluacion.disabled = !evaluacionSelect.value;
    });

    //  Evento para abrir el modal y mostrar la evaluación seleccionada
    btnVerEvaluacion.addEventListener("click", function () {
        const evaluacionId = evaluacionSelect.value;
        if (!evaluacionId) {
            console.warn(" No se ha seleccionado una evaluación.");
            return;
        }

        // Detectar el tipo de evaluación
        const tipoEvaluacion = evaluacionSelect.options[evaluacionSelect.selectedIndex].getAttribute("data-tipo");
        const resultadoAprendizaje = evaluacionSelect.options[evaluacionSelect.selectedIndex].getAttribute("data-resultado");
        const resultadoNormalizado = resultadoAprendizaje.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const resultadoCodificado = encodeURIComponent(resultadoNormalizado)
        let url;
        if (tipoEvaluacion === "usuario") {
            url = `/api/evaluacion-usuario/${evaluacionId}`;
        } else if (tipoEvaluacion === "predeterminada") {
            url = `/api/evaluacion-base/${resultadoCodificado}`;
        }

        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (!data.success || !data.datos.length) {
                    alert(" No se encontraron datos para esta evaluación.");
                    return;
                }
                const criteriosEstructurados = transformarDatos(data.datos, tipoEvaluacion);
                renderizarEvaluacionVista(criteriosEstructurados, data.nombreEvaluacion);
                modalVerEvaluacion.style.display = "block";
            })
            .catch(error => console.error(" Error al obtener evaluación:", error));
    });

    //  Cerrar modal
    btnCerrarModalVer.addEventListener("click", function () {
        modalVerEvaluacion.style.display = "none";
        limpiarFormularioEvaluacion();
        restaurarEstadoOriginal();
        
    });
    function restaurarEstadoOriginal() {
        btnEditarEvaluacion.textContent = "Editar Evaluación";
        btnEditarEvaluacion.classList.remove("modo-edicion");

        // Restaurar nombre de la evaluación
        const nombreEvaluacionElement = document.querySelector(".evaluacion-nombre");
        if (nombreEvaluacionElement) {
            const input = nombreEvaluacionElement.querySelector("input");
            if (input) {
                nombreEvaluacionElement.textContent = input.getAttribute("data-original-value");
            }
        }

        // Eliminar botón de guardar cambios
        const btnGuardar = document.getElementById("btnGuardarCambios");
        if (btnGuardar) {
            btnGuardar.remove();
        }

        // Eliminar los textareas sin afectar los tooltips originales
        document.querySelectorAll(".detalle-textarea").forEach(textarea => {
            textarea.remove();
        });

        // Restaurar nombres y puntajes
        document.querySelectorAll(".criterio-nombre, .indicador-nombre, .pregunta-nombre").forEach(element => {
            element.contentEditable = "false";
            element.style.border = "none";
        });

        document.querySelectorAll(".criterio-puntaje, .indicador-puntaje, .pregunta-puntaje").forEach(element => {
            const input = element.querySelector("input");
            if (input) {
                element.textContent = input.getAttribute("data-original-value");
            }
        });

        document.querySelectorAll(".criterio-nivel-basico, .criterio-nivel-intermedio, .criterio-nivel-alto, .indicador-nivel-basico, .indicador-nivel-intermedio, .indicador-nivel-alto").forEach(input => {
            input.setAttribute("disabled", "true");
            input.style.border = "none";
            input.value = input.getAttribute("data-original-value");
        });
    }
    //  Transformar datos en estructura jerárquica, asegurando que las preguntas estén en el indicador correcto
    function transformarDatos(datos, tipo) {
        const criterios = {};

        datos.forEach(fila => {
            const idCriterio = tipo === "usuario" ? fila.id_criterio : fila.id_criterio_base;
            const idIndicador = tipo === "usuario" ? fila.id_indLog : fila.id_indLog_base;
            const idPregunta = tipo === "usuario" ? fila.id_pregunta : fila.id_pregunta_base;

            // Si el criterio no existe, lo creamos
            if (!criterios[idCriterio]) {
                criterios[idCriterio] = {
                    id: idCriterio,
                    nombre: fila.criterio,
                    detalle: fila.criterio_detalle,
                    puntaje: fila.criterio_puntaje,
                    nivel_basico: fila.criterio_nivel_basico,
                    nivel_intermedio: fila.criterio_nivel_intermedio,
                    nivel_alto: fila.criterio_nivel_alto,
                    indicadores: {},
                };
            }

            // Si el indicador no existe dentro del criterio, lo agregamos
            if (!criterios[idCriterio].indicadores[idIndicador]) {
                criterios[idCriterio].indicadores[idIndicador] = {
                    id: idIndicador,
                    nombre: fila.indicador,
                    detalle: fila.indicador_detalle,
                    puntaje: fila.indicador_puntaje,
                    nivel_basico: fila.indicador_nivel_basico,
                    nivel_intermedio: fila.indicador_nivel_intermedio,
                    nivel_alto: fila.indicador_nivel_alto,
                    preguntas: [],
                };
            }

            // Agregar la pregunta al indicador correspondiente
            if (idPregunta && criterios[idCriterio].indicadores[idIndicador]) {
                criterios[idCriterio].indicadores[idIndicador].preguntas.push({
                    id: idPregunta,
                    nombre: fila.pregunta,
                    detalle: fila.pregunta_detalle,
                    puntaje: fila.pregunta_puntaje,
                });
            }
        });

        return criterios;
    }

    //  Renderizar evaluación en el modal sin edición
    function renderizarEvaluacionVista(criterios, nombreEvaluacion) {
        contenedorCriteriosVer.innerHTML = "";
        // 🔹 Agregar el nombre de la evaluación antes de los criterios
        const nombreEvaluacionDiv = document.createElement("div");
        nombreEvaluacionDiv.classList.add("evaluacion-header");
        nombreEvaluacionDiv.innerHTML = `
            <h2 class="evaluacion-nombre">${nombreEvaluacion}</h2>
        `;
        contenedorCriteriosVer.appendChild(nombreEvaluacionDiv);

        Object.keys(criterios).forEach(criterioId => {
            const criterio = criterios[criterioId];
            

            const criterioDiv = document.createElement("div");
            criterioDiv.classList.add("criterio");
            criterioDiv.setAttribute("data-id", criterio.id)
            criterioDiv.innerHTML = `
                <div class="criterio-header">
                    <h4 class="criterio-nombre" criterio-data-detalle="${criterio.detalle}">${criterio.nombre}</h4>
                    <span class="criterio-puntaje">${criterio.puntaje} puntos</span>
                    <button class="btn-toggle-clasificador" data-target="clasificador-${criterioId}">🏆</button>
                    <button class="btn-expandir" data-target="indicadores-${criterioId}">+</button>
                    <div class="criterio-detalle-tooltip">${criterio.detalle}</div>
                </div>

                <div class="clasificador" id="clasificador-${criterioId}" style="display: none;">
                    <h5>Clasificador de Niveles</h5>
                    <div class="clasificador-niveles">
                        <label>Básico: <input type="number" class="criterio-nivel-basico" value="${criterio.nivel_basico}" disabled></label>
                        <label>Intermedio: <input type="number" class="criterio-nivel-intermedio" value="${criterio.nivel_intermedio}" disabled></label>
                        <label>Alto: <input type="number" class="criterio-nivel-alto" value="${criterio.nivel_alto}" disabled></label>
                    </div>
                </div>
                <div class="indicadores" id="indicadores-${criterioId}" style="display: none;"></div>
            `;

            const indicadoresDiv = criterioDiv.querySelector(".indicadores");
            Object.keys(criterio.indicadores).forEach(indicadorId => {
                agregarIndicadorVista(indicadoresDiv, criterio.indicadores[indicadorId]);
            });

            contenedorCriteriosVer.appendChild(criterioDiv);
        });
        setupToggleClasificador();
        setupTooltipCriterios();
        setupExpandirBotones();
        setupTooltipindicadores();
        setupTooltippregunta();
    }

    function agregarIndicadorVista(contenedor, indicadorData) {
        const indicadorId = indicadorData.id || `nuevo-ind-${Date.now()}`;
        const indicadorDiv = document.createElement("div");
        indicadorDiv.classList.add("indicador");
        indicadorDiv.setAttribute("data-id", indicadorData.id);
        indicadorDiv.innerHTML = `
            <div class="indicador-header">
                <span class="indicador-nombre" indicador-data-detalle="${indicadorData.detalle}">${indicadorData.nombre}</span>
                <span class="indicador-puntaje">${indicadorData.puntaje} puntos</span>
                <button class="btn-toggle-clasificador" data-target="clasificador-${indicadorId}">🏆</button>
                <button class="btn-expandir-preguntas" data-target="preguntas-${indicadorId}">+</button>
                <div class="indicador-detalle-tooltip">${indicadorData.detalle}</div>
            </div>

            <div class="clasificador" id="clasificador-${indicadorId}" style="display: none;">
                <h5>Clasificador de Niveles</h5>
                <div class="clasificador-niveles">
                    <label>Básico: <input type="number" class="indicador-nivel-basico" value="${indicadorData.nivel_basico}" disabled></label>
                    <label>Intermedio: <input type="number" class="indicador-nivel-intermedio" value="${indicadorData.nivel_intermedio}" disabled></label>
                    <label>Alto: <input type="number" class="indicador-nivel-alto" value="${indicadorData.nivel_alto}" disabled></label>
                </div>
            </div>
            <div class="preguntas" id="preguntas-${indicadorId}" style="display: none;"></div>
        `;

        const preguntasDiv = indicadorDiv.querySelector(".preguntas");
        indicadorData.preguntas.forEach(pregunta => {
            agregarPreguntaVista(preguntasDiv, pregunta);
        });

        contenedor.appendChild(indicadorDiv);
        setupExpandirBotones();
        setupTooltipindicadores();
    }

    function agregarPreguntaVista(contenedor, preguntaData) {
        const preguntaDiv = document.createElement("div");
        preguntaDiv.classList.add("pregunta");
        preguntaDiv.setAttribute("data-id", preguntaData.id);
        preguntaDiv.innerHTML = `
            <div class="pregunta-header">
                <span class="pregunta-nombre" pregunta-data-detalle="${preguntaData.detalle}">${preguntaData.nombre}</span>
                <span class="pregunta-puntaje">${preguntaData.puntaje} puntos</span>
                <div class="pregunta-detalle-tooltip">${preguntaData.detalle}</div>
            </div>
        `;

        contenedor.appendChild(preguntaDiv);
        setupTooltippregunta();
    }
}

function limpiarFormularioEvaluacion() {
    console.log(" Limpiando el formulario de creación...");

    document.getElementById("nuevoNombreEvaluacion").value = "";
    document.getElementById("resultadoAprendizaje").value = "";

    //  Borrar todos los criterios anteriores antes de agregar nuevos
    document.querySelectorAll(".criterio").forEach(criterio => criterio.remove());

    // Reiniciar el array de criterios si se usa globalmente
    criterios = [];

    console.log(" Formulario de evaluación reseteado.");
}


function setupAgregarEstudiante() {
    const btnAgregarEstudiante = document.getElementById("btnAgregarEstudiante");
    const btnGuardarEstudiante = document.getElementById("saveStudentBtn2");
    const btnCerrarModal = document.getElementById("btnCerrarModal1");
    const btnSubirCSV = document.getElementById("uploadCSVBtn");
    const addStudentModal = document.getElementById("addStudentModal");
    const modalFormatoEstCSV= document.getElementById("modalFormatoEstCSV");
    const btnCerrarModal2 = document.getElementById("btnCerrarModalEst");
    const cursoSelect = document.getElementById("cursoSelect");
    const fileInput = document.getElementById("csvFile");

    if (!btnAgregarEstudiante || !btnGuardarEstudiante || !btnCerrarModal || !btnSubirCSV || !addStudentModal || !cursoSelect || !fileInput) {
        console.error(" Error: No se encontraron todos los elementos requeridos.");
        return;
    }

    // 📌 Función para abrir el modal
    function abrirModal() {
        const cursoSelectValor = cursoSelect.value;
        if (!cursoSelectValor) {
            alert(" Selecciona un curso antes de agregar estudiantes.");
            return;
        }
        addStudentModal.style.display = "flex";
        modalFormatoEstCSV.style.display = "flex";
    }

    // 📌 Función para cerrar el modal y limpiar el formulario
    function cerrarModal() {
        addStudentModal.style.display = "none";
        document.getElementById("addStudentForm").reset();
    }
    function CerrarModal2() {
        modalFormatoEstCSV.style.display = "none";
        document.getElementById("addStudentForm").reset();
    }
    //  Función para agregar un estudiante manualmente
    function agregarEstudiante() {
        const studentCode = document.getElementById("studentCode")?.value.trim();
        const studentName = document.getElementById("studentName")?.value.trim();
        const studentAge = document.getElementById("studentAge")?.value.trim();
        const studentEmail = document.getElementById("studentEmail")?.value.trim();
        const cursoId = cursoSelect.value; //  Obtener el curso seleccionado

        if (!studentCode || !studentName || !studentAge || !studentEmail || !cursoId) {
            alert(" Todos los campos son obligatorios, incluyendo la selección de un curso.");
            return;
        }

        fetch("/addStudent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                codigo_estudiante: studentCode,
                nombre_estudiante: studentName,
                edad: studentAge,
                correo: studentEmail,
                curso_id: cursoId,
            }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                alert(" Estudiante agregado correctamente.");
                document.getElementById("addStudentForm").reset();
                cargarEstudiantes(cursoId);
            } else {
                alert(" Error al agregar estudiante.");
            }
        })
        .catch(error => {
            console.error("Error al agregar estudiante:", error);
            alert("⚠️ Hubo un problema al agregar el estudiante.");
        });
    }

    //  Función para subir estudiantes desde un archivo CSV
    function subirCSV() {
        const file = fileInput.files[0];
        const cursoId = cursoSelect.value;

        if (!file || !cursoId) {
            alert(" Selecciona un archivo CSV y un curso antes de subir.");
            return;
        }

        const formData = new FormData();
        formData.append("csvFile", file);
        formData.append("curso_id", cursoId);

        fetch("/uploadCSV", {
            method: "POST",
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(" Estudiantes agregados correctamente.");
                cargarEstudiantes(cursoId);
                cerrarModal();
            } else {
                alert(" Error al agregar estudiantes: " + data.error);
            }
        })
        .catch(error => {
            console.error(" Error al subir el CSV:", error);
            alert("Hubo un problema al procesar el archivo.");
        });
    }

    //  Asignar eventos a los botones
    btnAgregarEstudiante.addEventListener("click", abrirModal);
    btnCerrarModal.addEventListener("click", cerrarModal);
    btnCerrarModal2.addEventListener("click", CerrarModal2);
    btnGuardarEstudiante.addEventListener("click", agregarEstudiante);
    btnSubirCSV.addEventListener("click", subirCSV);
}

// eliminar estudiantes:
function setupEliminarEstudiantes() {
    const btnEliminarSeleccionados = document.getElementById("btnEliminarSeleccionados");

    function actualizarEstadoBoton() {
        const seleccionados = document.querySelectorAll(".seleccionar-estudiante:checked");
        btnEliminarSeleccionados.disabled = seleccionados.length === 0;
    }

   

    btnEliminarSeleccionados.addEventListener("click", function () {
        let seleccionados = document.querySelectorAll(".seleccionar-estudiante:checked");

        if (seleccionados.length === 0) {
            alert(" No hay estudiantes seleccionados para eliminar.");
            return;
        }

        if (!confirm(`¿Seguro que deseas eliminar ${seleccionados.length} estudiante(s)?`)) {
            return;
        }

        let estudiantesAEliminar = Array.from(seleccionados).map(checkbox => checkbox.dataset.codigo);
        let cursoId = document.getElementById("cursoSelect").value; // 🔹 Se obtiene el curso seleccionado

        fetch("/deleteStudent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estudiantes: estudiantesAEliminar, curso_id: cursoId }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(" Estudiantes eliminados correctamente.");
                //  Eliminar filas de la tabla dinámicamente
                seleccionados.forEach(checkbox => checkbox.closest("tr").remove());
                actualizarEstadoBoton();
            } else {
                alert(" Error al eliminar estudiantes: " + data.error);
            }
        })
        .catch(error => console.error(" Error al eliminar estudiantes:", error));
    });

    return { cargarEstudiantes };
}
function setupCrearEvaluacion() {
    const btnCrearEvaluacion = document.getElementById("btnCrearEvaluacion");
    const modalCrearEvaluacion = document.getElementById("modalCrearEvaluacion");
    const btnCerrarModalCrear = document.getElementById("btnCerrarModalCrear");
    const btnGuardarEvaluacion = document.getElementById("btnGuardarEvaluacion");
    const contenedorCriteriosCrear = document.getElementById("contenedorCriteriosCrear");

    

    if (!btnCrearEvaluacion || !modalCrearEvaluacion || !btnCerrarModalCrear || !btnGuardarEvaluacion || !contenedorCriteriosCrear) {
        console.error("🔴 Error: No se encontraron elementos para crear evaluación.");
        return;
    }

    // 📌 Evento para abrir el modal
    btnCrearEvaluacion.addEventListener("click", function () {
        modalCrearEvaluacion.style.display = "flex";
        limpiarFormularioEvaluacion();
        cargarEvaluacionBase();
        
    });
    
    // 📌 Botón de cerrar modal con "X"
    btnCerrarModalCrear.addEventListener("click", function () {
        modalCrearEvaluacion.style.display = "none";
        limpiarFormularioEvaluacion();
    });

    // 📌 Evento para guardar la evaluación
    btnGuardarEvaluacion.addEventListener("click", function () {
        guardarNuevaEvaluacion();
    });

    const selectResultadoAprendizaje = document.getElementById("resultadoAprendizaje");

    if (selectResultadoAprendizaje) {
        selectResultadoAprendizaje.addEventListener("change", function () {
            cargarEvaluacionBase(); // Cargar nueva evaluación al cambiar la opción
        });
    }

    // 📌 Cargar evaluación base desde la BD
    function cargarEvaluacionBase() {
        const resultadoAprendizaje = document.getElementById("resultadoAprendizaje").value;

        if (!resultadoAprendizaje) {
            console.warn("⚠️ No se ha seleccionado un resultado de aprendizaje.");
            return;

        }
        const resultadoCodificado = encodeURIComponent(resultadoAprendizaje);
        fetch(`/api/evaluacion-base/${resultadoCodificado}`)
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    alert("❌ Error al cargar la evaluación base.");
                    return;
                }
    
                contenedorCriteriosCrear.innerHTML = "";
                const criterios = {};
    
                data.datos.forEach(row => {
                    if (!criterios[row.id_criterio_base]) {
                        criterios[row.id_criterio_base] = {
                            id: row.id_criterio_base,
                            nombre: row.criterio,
                            detalle: row.criterio_detalle,
                            puntaje: row.criterio_puntaje,
                            nivel_basico: row.criterio_nivel_basico,
                            nivel_intermedio: row.criterio_nivel_intermedio,
                            nivel_alto: row.criterio_nivel_alto,
                            indicadores: {}
                        };
                    }
    
                    if (!criterios[row.id_criterio_base].indicadores[row.id_indLog_base]) {
                        criterios[row.id_criterio_base].indicadores[row.id_indLog_base] = {
                            id: row.id_indLog_base,
                            nombre: row.indicador,
                            detalle: row.indicador_detalle,
                            puntaje: row.indicador_puntaje,
                            nivel_basico: row.indicador_nivel_basico,
                            nivel_intermedio: row.indicador_nivel_intermedio,
                            nivel_alto: row.indicador_nivel_alto,
                            preguntas: []
                        };
                    }
    
                    if (row.id_pregunta_base) {
                        criterios[row.id_criterio_base].indicadores[row.id_indLog_base].preguntas.push({
                            id: row.id_pregunta_base,
                            nombre: row.pregunta,
                            detalle: row.pregunta_detalle,
                            puntaje: row.pregunta_puntaje
                        });
                    }
                });
    
                renderizarEvaluacion(criterios);
                agregarValidacionNiveles();
            })
            .catch(error => console.error("❌ Error al obtener evaluación base:", error));
    }
    function agregarValidacionNiveles() {
        document.querySelectorAll(".criterio-nivel-basico, .criterio-nivel-intermedio, .criterio-nivel-alto, .indicador-nivel-basico, .indicador-nivel-intermedio, .indicador-nivel-alto")
            .forEach(input => {
                input.removeAttribute("disabled");
                input.style.border = "1px solid blue";

                // 📌 Validar en tiempo real los niveles al crearlos
                input.addEventListener("input", function () {
                    validarNiveles(input);
                });
            });
    }
    // 📌 Renderizar criterios y elementos dentro del modal
    function renderizarEvaluacion(criterios) {
        contenedorCriteriosCrear.innerHTML = "";
    
        Object.keys(criterios).forEach(criterioId => {
            const criterio = criterios[criterioId];
    
            // 🔹 Crear contenedor del criterio
            const criterioDiv = document.createElement("div");
            criterioDiv.classList.add("criterio");
            criterioDiv.innerHTML = `
                <div class="criterio-header">
                    <h4 class="criterio-nombre" criterio-data-detalle="${criterio.detalle}">${criterio.nombre}</h4>
                    <input type="number" class="criterio-puntaje" value="${criterio.puntaje}">
                    <button class="btn-expandir" data-target="indicadores-${criterioId}">+</button>
                    <button class="btnAgregarIndicador" data-criterio="${criterioId}">+ Indicador</button>
                    <div class="criterio-detalle-tooltip">${criterio.detalle}</div>
                    <button class="btn-toggle-clasificador" data-target="clasificador-${criterioId}">
                        🏆
                    </button>
                </div>
                

                <div class="clasificador" id="clasificador-${criterioId}" style="display: none;">
                    <h5>Clasificador de Niveles</h5>
                    <label>Básico: <input type="number" class="criterio-nivel-basico" value="${criterio.nivel_basico}"></label>
                    <label>Intermedio: <input type="number" class="criterio-nivel-intermedio" value="${criterio.nivel_intermedio}"></label>
                    <label>Alto: <input type="number" class="criterio-nivel-alto" value="${criterio.nivel_alto}"></label>
                </div>

                <div class="indicadores" id="indicadores-${criterioId}" style="display: none;"></div>
            `;
    
            const indicadoresDiv = criterioDiv.querySelector(".indicadores");
    
            Object.keys(criterio.indicadores).forEach(indicadorId => {
                agregarIndicador(indicadoresDiv, criterio.indicadores[indicadorId]);
            });
    
            contenedorCriteriosCrear.appendChild(criterioDiv);
        });
    
        setupExpandirBotones();
        setupBotonesAgregarIndicador();
        setupTooltipCriterios();
        setupToggleClasificador();
        agregarValidacionNiveles();
    }
    

    function agregarIndicador(contenedor, indicadorData = { id: "", nombre: "", detalle: "", puntaje: 0, preguntas: [] }) {
        const indicadorId = indicadorData.id || `nuevo-ind-${Date.now()}`;
        
        const nivelBasico = indicadorData.nivel_basico ?? 0;
        const nivelIntermedio = indicadorData.nivel_intermedio ?? 0;
        const nivelAlto = indicadorData.nivel_alto ?? 0;

        const indicadorDiv = document.createElement("div");
        indicadorDiv.classList.add("indicador");
        indicadorDiv.innerHTML = `
            <div class="indicador-header">
                <input type="text" class="indicador-nombre" value="${indicadorData.nombre}" placeholder="Nombre del Indicador">
                <textarea class="indicador-detalle" placeholder="Detalle">${indicadorData.detalle}</textarea>
                <input type="number" class="indicador-puntaje" value="${indicadorData.puntaje}">
                <button class="btn-expandir-preguntas" data-target="preguntas-${indicadorId}">+</button>
                <button class="btn-toggle-clasificador" data-target="clasificador-${indicadorId}">
                    🏆
                </button>
                <button class="btnAgregarPregunta" data-indicador="${indicadorId}">+ Pregunta</button>
                <button class="btnEliminarIndicador">❌</button>

            </div>

            <div class="clasificador" id="clasificador-${indicadorId}" style="display: none;">
                <h5>Clasificador de Niveles</h5>
                <label>Básico: <input type="number" class="indicador-nivel-basico" value="${nivelBasico}"></label>
                <label>Intermedio: <input type="number" class="indicador-nivel-intermedio" value="${nivelIntermedio}"></label>
                <label>Alto: <input type="number" class="indicador-nivel-alto" value="${nivelAlto}"></label>
            </div>
            <div class="preguntas" id="preguntas-${indicadorId}" style="display: none;"></div>
        `;
    
        const preguntasDiv = indicadorDiv.querySelector(".preguntas");
    
        indicadorData.preguntas.forEach(pregunta => {
            agregarPregunta(preguntasDiv, pregunta);
        });
    
        contenedor.appendChild(indicadorDiv);
        setupBotonesAgregarPregunta();
        setupBotonesEliminarIndicador();
        setupExpandirBotones();
        setupToggleClasificador();
    }

    // 📌 Agregar preguntas dinámicamente
    function agregarPregunta(contenedor, preguntaData = { nombre: "", detalle: "", puntaje: 0 }) {
        const preguntaDiv = document.createElement("div");
        preguntaDiv.classList.add("pregunta");
        preguntaDiv.innerHTML = `
            <input type="text" class="pregunta-nombre" value="${preguntaData.nombre}" placeholder="Nombre de la Pregunta">
            <textarea class="pregunta-detalle" placeholder="Detalle">${preguntaData.detalle}</textarea>
            <input type="number" class="pregunta-puntaje" value="${preguntaData.puntaje}">
            <button class="btnEliminarPregunta">❌</button>
        `;

        contenedor.appendChild(preguntaDiv);
        setupBotonesEliminarPregunta();
    }

    // 📌 Configurar botones de agregar indicadores
    function setupBotonesAgregarIndicador() {
        document.querySelectorAll(".btnAgregarIndicador").forEach(button => {
            button.addEventListener("click", function () {
                const criterioId = this.dataset.criterio;
                const contenedorIndicadores = document.getElementById(`indicadores-${criterioId}`);
                agregarIndicador(contenedorIndicadores);
            });
        });
    }
    // 📌 Configurar botones de agregar preguntas
    function setupBotonesAgregarPregunta() {
        document.removeEventListener("click", agregarPreguntaEvent);
        document.addEventListener("click", agregarPreguntaEvent);
    }
    
    function agregarPreguntaEvent(event) {
        if (event.target.classList.contains("btnAgregarPregunta")) {
            const indicadorId = event.target.dataset.indicador;
            const contenedorPreguntas = document.getElementById(`preguntas-${indicadorId}`);
            
            if (contenedorPreguntas) {
                agregarPregunta(contenedorPreguntas);
            }
        }
    }

    // 📌 Configurar botones de eliminar indicadores
    function setupBotonesEliminarIndicador() {
        document.querySelectorAll(".btnEliminarIndicador").forEach(button => {
            button.addEventListener("click", function () {
                this.parentElement.parentElement.remove();
            });
        });
    }

    // 📌 Configurar botones de eliminar preguntas
    function setupBotonesEliminarPregunta() {
        document.querySelectorAll(".btnEliminarPregunta").forEach(button => {
            button.addEventListener("click", function () {
                this.parentElement.remove();
            });
        });
    }
   
    
    
    // 📌 Guardar evaluación completa
    async function guardarNuevaEvaluacion() { 
        const nombreEvaluacion = document.getElementById("nuevoNombreEvaluacion").value.trim();
        const resultadoAprendizaje = document.getElementById("resultadoAprendizaje").value;
        
        if (!nombreEvaluacion) {
            alert("❌ Debes ingresar un nombre para la evaluación.");
            return;
        }
    
        let errores = validarPuntajes();
        if (errores.length > 0) {
            alert(errores.join("\n"));
            return;
        }
    
        const criteriosData = [];
    
        document.querySelectorAll(".criterio").forEach(criterio => {
            const criterioNombre = criterio.querySelector(".criterio-nombre").textContent.trim();
            const criterioDetalle = criterio.querySelector(".criterio-detalle-tooltip").textContent.trim();
            const criterioPuntaje = parseFloat(criterio.querySelector(".criterio-puntaje").value.trim()) || 0;

            const nivelBasico = parseFloat(criterio.querySelector(".criterio-nivel-basico").value.trim()) || 0;
            const nivelIntermedio = parseFloat(criterio.querySelector(".criterio-nivel-intermedio").value.trim()) || 0;
            const nivelAlto = parseFloat(criterio.querySelector(".criterio-nivel-alto").value.trim()) || 0;

            const indicadoresData = [];
    
            criterio.querySelectorAll(".indicador").forEach(indicador => {
                const indicadorNombre = indicador.querySelector(".indicador-nombre").value.trim();
                const indicadorDetalle = indicador.querySelector(".indicador-detalle").value.trim();
                const indicadorPuntaje = parseFloat(indicador.querySelector(".indicador-puntaje").value) || 0;

                const nivelBasicoInd = parseFloat(indicador.querySelector(".indicador-nivel-basico").value.trim()) || 0;
                const nivelIntermedioInd = parseFloat(indicador.querySelector(".indicador-nivel-intermedio").value.trim()) || 0;
                const nivelAltoInd = parseFloat(indicador.querySelector(".indicador-nivel-alto").value.trim()) || 0;
                const preguntasData = [];
    
                indicador.querySelectorAll(".pregunta").forEach(pregunta => {
                    preguntasData.push({
                        nombre: pregunta.querySelector(".pregunta-nombre").value.trim(),
                        detalle: pregunta.querySelector(".pregunta-detalle").value.trim(),
                        puntaje: parseFloat(pregunta.querySelector(".pregunta-puntaje").value) || 0
                    });
                });
    
                indicadoresData.push({
                    nombre: indicadorNombre,
                    detalle: indicadorDetalle,
                    puntaje: indicadorPuntaje,
                    nivel_basico: nivelBasicoInd,
                    nivel_intermedio: nivelIntermedioInd,
                    nivel_alto: nivelAltoInd,
                    preguntas: preguntasData
                });
            });
    
            criteriosData.push({
                nombre: criterioNombre,
                detalle: criterioDetalle,
                puntaje: criterioPuntaje,
                nivel_basico: nivelBasico,
                nivel_intermedio: nivelIntermedio,
                nivel_alto: nivelAlto,
                indicadores: indicadoresData
            });
        });
    
        try {
            const response = await fetch("/api/guardar-evaluacion", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nombre: nombreEvaluacion,
                    resultadoAprendizaje: resultadoAprendizaje,
                    criterios: criteriosData
                })
            });
    
            const result = await response.json();
    
            if (result.success) {
                alert("✅ Evaluación guardada correctamente.");

                localStorage.setItem("evaluacionCreadaId", result.id);
                localStorage.setItem("seccionActiva", "evaluacion");
                location.reload(); // o window.location.reload();

            } else {
                alert(`❌ Error al guardar la evaluación: ${result.error}`);
            }
        } catch (error) {
            console.error("❌ Error en la solicitud:", error);
            alert("❌ Hubo un problema al conectar con el servidor.");
        }
    }
}

 //  Función para expandir/cerrar indicadores y preguntas sin duplicaciones
 function setupExpandirBotones() {
    document.removeEventListener("click", expandirElemento); // Elimina eventos previos si existen
    document.addEventListener("click", expandirElemento);
}
function expandirElemento(event) {
    if (event.target.classList.contains("btn-expandir") || event.target.classList.contains("btn-expandir-preguntas")) {
        const targetId = event.target.dataset.target;
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
            targetElement.style.display = targetElement.style.display === "none" ? "block" : "none";
            event.target.textContent = event.target.textContent === "+" ? "-" : "+";
        }
    }
}
function validarPuntajes() {
    let criterios = document.querySelectorAll(".criterio");
    let totalGeneral = 0;
    let errores = [];

    criterios.forEach(criterio => {
        let criterioPuntajeInput = criterio.querySelector(".criterio-puntaje");
        let criterioNombre = criterio.querySelector(".criterio-nombre").textContent.trim();
        let criterioPuntaje = parseFloat(criterioPuntajeInput.value);

        //  Validar que el puntaje del criterio no esté vacío o sea 0
        if (isNaN(criterioPuntaje) || criterioPuntaje <= 0) {
            errores.push(` El puntaje del criterio "${criterioPuntaje}" no puede estar vacío ni ser 0.`);
            criterioPuntajeInput.style.border = "2px solid red";
            return; // Salir de la iteración si es inválido
        } else {
            criterioPuntajeInput.style.border = "";
        }

        let indicadores = criterio.querySelectorAll(".indicador");
        let sumaIndicadores = 0;

        indicadores.forEach(indicador => {
            let indicadorPuntajeInput = indicador.querySelector(".indicador-puntaje");
            let indicadorNombreInput = indicador.querySelector(".indicador-nombre").value.trim();
            let indicadorPuntaje = parseFloat(indicadorPuntajeInput.value);

            //  Validar que el puntaje del indicador no esté vacío o sea 0
            if (indicadorNombreInput === "" || isNaN(indicadorPuntaje) || indicadorPuntaje <= 0) {
                errores.push(` El indicador "${indicadorNombreInput}" del criterio "${criterioNombre}" no puede estar vacío ni tener un puntaje de 0.`);
                indicadorPuntajeInput.style.border = "2px solid red";
                return;
            } else {
                indicadorPuntajeInput.style.border = "";
            }

            let preguntas = indicador.querySelectorAll(".pregunta-puntaje");
            let sumaPreguntas = 0;

            preguntas.forEach(pregunta => {
                let preguntaPuntaje = parseFloat(pregunta.value);

                //  Validar que el puntaje de la pregunta no esté vacío o sea 0
                if (isNaN(preguntaPuntaje) || preguntaPuntaje <= 0) {
                    errores.push(` Hay preguntas dentro del indicador "${indicadorNombreInput}" que tienen valores vacíos o en 0.`);
                    pregunta.style.border = "2px solid red";
                    return;
                } else {
                    pregunta.style.border = "";
                }

                sumaPreguntas += preguntaPuntaje;
            });

            //  Validar que la suma de preguntas sea igual al puntaje del indicador
            if (sumaPreguntas !== indicadorPuntaje) {
                errores.push(` La suma de las preguntas del indicador "${indicadorNombreInput}" debe ser exactamente ${indicadorPuntaje}.`);
                indicadorPuntajeInput.style.border = "2px solid red";
            } else {
                indicadorPuntajeInput.style.border = "";
            }

            sumaIndicadores += indicadorPuntaje;
        });

        //  Validar que la suma de los indicadores sea igual al puntaje del criterio
        if (sumaIndicadores !== criterioPuntaje) {
            errores.push(` La suma de los indicadores del criterio "${criterioNombre}" debe ser exactamente ${criterioPuntaje}.`);
            criterioPuntajeInput.style.border = "2px solid red";
        } else {
            criterioPuntajeInput.style.border = "";
        }

        totalGeneral += criterioPuntaje;
    });

    //  Validar que la suma total de los criterios sea 100
    if (totalGeneral !== 100) {
        errores.push(" La suma total de los criterios debe ser exactamente 100.");
    }

    return errores;
}

//  Validación en tiempo real
document.addEventListener("input", function (event) {
    if (
        event.target.matches(".criterio-puntaje") || 
        event.target.matches(".indicador-puntaje") || 
        event.target.matches(".pregunta-puntaje")
    ) {
        validarPuntajes();
    }
});

function validarNiveles(input) {
    let contenedor = input.closest(".clasificador");

    // Determinar si es un clasificador de criterio o de indicador
    let esCriterio = contenedor.closest(".criterio") !== null;
    let esIndicador = contenedor.closest(".indicador") !== null;

    let puntajeTotalInput = esIndicador 
        ? contenedor.closest(".indicador").querySelector(".indicador-puntaje")
        : contenedor.closest(".criterio").querySelector(".criterio-puntaje");

    let puntajeTotal = puntajeTotalInput ? parseFloat(puntajeTotalInput.value) : NaN;

    if (isNaN(puntajeTotal) || puntajeTotal <= 0) {
        alert(" El puntaje total del criterio o indicador debe ser un número válido y mayor que 0.");
        return;
    }

    // Seleccionamos los inputs de niveles asegurándonos de diferenciarlos por tipo
    let nivelBasicoInput = esIndicador 
        ? contenedor.querySelector(".indicador-nivel-basico") 
        : contenedor.querySelector(".criterio-nivel-basico");

    let nivelIntermedioInput = esIndicador 
        ? contenedor.querySelector(".indicador-nivel-intermedio") 
        : contenedor.querySelector(".criterio-nivel-intermedio");

    let nivelAltoInput = esIndicador 
        ? contenedor.querySelector(".indicador-nivel-alto") 
        : contenedor.querySelector(".criterio-nivel-alto");

    let nivelBasico = parseFloat(nivelBasicoInput.value) || 0;
    let nivelIntermedio = parseFloat(nivelIntermedioInput.value) || 0;
    let nivelAlto = parseFloat(nivelAltoInput.value) || 0;

    //  Verificar que ningún nivel sea negativo
    if (nivelBasico < 0 || nivelIntermedio < 0 || nivelAlto < 0) {
        alert(" Los valores de los niveles no pueden ser negativos.");
        input.value = 0;
        return;
    }

    //  Nivel Básico no puede superar el 40% del puntaje total
    if (nivelBasico > puntajeTotal * 0.40) {
        alert(` El nivel Básico no puede superar el 40% del puntaje total (${(puntajeTotal * 0.40).toFixed(2)}).`);
        nivelBasicoInput.value = (puntajeTotal * 0.40).toFixed(2);
    }

    //  Nivel Intermedio debe estar entre el Básico y el 70% del puntaje total
    if (nivelIntermedio < nivelBasico || nivelIntermedio > puntajeTotal * 0.80) {
        alert(` El nivel Intermedio debe estar entre el nivel Básico y el 80% del puntaje total (${(puntajeTotal * 0.70).toFixed(2)}).`);
        nivelIntermedioInput.value = (puntajeTotal * 0.80).toFixed(2);
    }

    //  Nivel Alto debe estar entre el intermedio y el puntaje total
    if (nivelAlto < nivelIntermedio || nivelAlto > puntajeTotal ) {
        alert(` El nivel Alto debe estar entre el Intermedio y el puntaje total (${puntajeTotal.toFixed(2)}).`);
        nivelAltoInput.value = puntajeTotal.toFixed(2);
    }
}

function setupTooltipCriterios() {
    document.querySelectorAll(".criterio-nombre").forEach(nombre => {
        nombre.addEventListener("mouseenter", function () {
            const tooltip = this.parentElement.querySelector(".criterio-detalle-tooltip");
            if (tooltip) {
                tooltip.style.display = "block";
                tooltip.style.opacity = "1";
            }
        });

        nombre.addEventListener("mouseleave", function () {
            const tooltip = this.parentElement.querySelector(".criterio-detalle-tooltip");
            if (tooltip) {
                tooltip.style.opacity = "0";
                setTimeout(() => {
                    tooltip.style.display = "none";
                }, 200); // Pequeño retraso para suavizar la animación
            }
        });
    });
}
function setupTooltipindicadores() {
    document.querySelectorAll(".indicador-nombre").forEach(nombre => {
        nombre.addEventListener("mouseenter", function () {
            const tooltip = this.parentElement.querySelector(".indicador-detalle-tooltip");
            if (tooltip) {
                tooltip.style.display = "block";
                tooltip.style.opacity = "1";
            }
        });

        nombre.addEventListener("mouseleave", function () {
            const tooltip = this.parentElement.querySelector(".indicador-detalle-tooltip");
            if (tooltip) {
                tooltip.style.opacity = "0";
                setTimeout(() => {
                    tooltip.style.display = "none";
                }, 200); // Pequeño retraso para suavizar la animación
            }
        });
    });
}
function setupTooltippregunta() {
    document.querySelectorAll(".pregunta-nombre").forEach(nombre => {
        nombre.addEventListener("mouseenter", function () {
            const tooltip = this.parentElement.querySelector(".pregunta-detalle-tooltip");
            if (tooltip) {
                tooltip.style.display = "block";
                tooltip.style.opacity = "1";
            }
        });

        nombre.addEventListener("mouseleave", function () {
            const tooltip = this.parentElement.querySelector(".pregunta-detalle-tooltip");
            if (tooltip) {
                tooltip.style.opacity = "0";
                setTimeout(() => {
                    tooltip.style.display = "none";
                }, 200); // Pequeño retraso para suavizar la animación
            }
        });
    });
}
function expandirClasificador(event) {
    if (event.target.classList.contains("btn-toggle-clasificador")) {
        const targetId = event.target.dataset.target;
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
            targetElement.style.display = targetElement.style.display === "none" ? "block" : "none";
            event.target.textContent = event.target.textContent === "🏆" ? "🔽" : "🏆";
        }
    }
}
function setupToggleClasificador() {
    document.removeEventListener("click", expandirClasificador); // Evita múltiples eventos
    document.addEventListener("click", expandirClasificador);
}
function validarEdicionEvaluacion() {
    let criterios = document.querySelectorAll(".criterio");
    let totalGeneral = 0;
    let errores = [];

    criterios.forEach(criterio => {
        let criterioPuntajeInput = criterio.querySelector(".criterio-puntaje input");
        let criterioNombre = criterio.querySelector(".criterio-nombre").textContent.trim();
        let criterioPuntaje = criterioPuntajeInput ? parseFloat(criterioPuntajeInput.value) : NaN;

        // 🔴 Validar que el puntaje del criterio no sea NaN o 0
        if (isNaN(criterioPuntaje) || criterioPuntaje <= 0) {
            errores.push(`⚠️ El puntaje del criterio "${criterioNombre}" no puede estar vacío ni ser 0.`);
            criterioPuntajeInput.style.border = "2px solid red";
            return;
        } else {
            criterioPuntajeInput.style.border = "";
        }

        let indicadores = criterio.querySelectorAll(".indicador");
        let sumaIndicadores = 0;

        indicadores.forEach(indicador => {
            let indicadorPuntajeInput = indicador.querySelector(".indicador-puntaje input");
            let indicadorNombre = indicador.querySelector(".indicador-nombre").textContent.trim();
            let indicadorPuntaje = indicadorPuntajeInput ? parseFloat(indicadorPuntajeInput.value) : NaN;

            if (isNaN(indicadorPuntaje) || indicadorPuntaje <= 0) {
                errores.push(`⚠️ El indicador "${indicadorNombre}" del criterio "${criterioNombre}" no puede estar vacío ni ser 0.`);
                indicadorPuntajeInput.style.border = "2px solid red";
                return;
            } else {
                indicadorPuntajeInput.style.border = "";
            }

            let preguntas = indicador.querySelectorAll(".pregunta-puntaje input");
            let sumaPreguntas = 0;

            preguntas.forEach(pregunta => {
                let preguntaPuntaje = pregunta ? parseFloat(pregunta.value) : NaN;

                if (isNaN(preguntaPuntaje) || preguntaPuntaje <= 0) {
                    errores.push(`⚠️ Hay preguntas dentro del indicador "${indicadorNombre}" con valores vacíos o en 0.`);
                    pregunta.style.border = "2px solid red";
                    return;
                } else {
                    pregunta.style.border = "";
                }

                sumaPreguntas += preguntaPuntaje;
            });

            if (sumaPreguntas !== indicadorPuntaje) {
                errores.push(`⚠️ La suma de las preguntas del indicador "${indicadorNombre}" debe ser ${indicadorPuntaje}.`);
                indicadorPuntajeInput.style.border = "2px solid red";
            } else {
                indicadorPuntajeInput.style.border = "";
            }

            sumaIndicadores += indicadorPuntaje;
        });

        if (sumaIndicadores !== criterioPuntaje) {
            errores.push(`⚠️ La suma de los indicadores del criterio "${criterioNombre}" debe ser ${criterioPuntaje}.`);
            criterioPuntajeInput.style.border = "2px solid red";
        } else {
            criterioPuntajeInput.style.border = "";
        }

        totalGeneral += criterioPuntaje;
    });

    if (totalGeneral !== 100) {
        errores.push("⚠️ La suma total de los criterios debe ser 100.");
    }

    return errores;
}
function validarNivelesEdicion(input) {
    let contenedor = input.closest(".clasificador");

    // Determinar si es un clasificador de criterio o de indicador
    let esCriterio = contenedor.closest(".criterio") !== null;
    let esIndicador = contenedor.closest(".indicador") !== null;

    let puntajeTotalInput = esIndicador 
        ? contenedor.closest(".indicador").querySelector(".indicador-puntaje input") 
        : contenedor.closest(".criterio").querySelector(".criterio-puntaje input");

    let puntajeTotal = puntajeTotalInput ? parseFloat(puntajeTotalInput.value) : NaN;


    // Seleccionamos los inputs de niveles asegurándonos de diferenciarlos por tipo
    let nivelBasicoInput = esIndicador 
        ? contenedor.querySelector(".indicador-nivel-basico") 
        : contenedor.querySelector(".criterio-nivel-basico");

    let nivelIntermedioInput = esIndicador 
        ? contenedor.querySelector(".indicador-nivel-intermedio") 
        : contenedor.querySelector(".criterio-nivel-intermedio");

    let nivelAltoInput = esIndicador 
        ? contenedor.querySelector(".indicador-nivel-alto") 
        : contenedor.querySelector(".criterio-nivel-alto");

    let nivelBasico = parseFloat(nivelBasicoInput.value) || 0;
    let nivelIntermedio = parseFloat(nivelIntermedioInput.value) || 0;
    let nivelAlto = parseFloat(nivelAltoInput.value) || 0;

    // 🔴 Verificar que ningún nivel sea negativo
    if (nivelBasico < 0 || nivelIntermedio < 0 || nivelAlto < 0) {
        alert("⚠️ Los valores de los niveles no pueden ser negativos.");
        input.value = 0;
        return;
    }

    // 🔴 Nivel Básico no puede superar el 40% del puntaje total
    if (nivelBasico > puntajeTotal * 0.40) {
        alert(`⚠️ El nivel Básico no puede superar el 40% del puntaje total (${(puntajeTotal * 0.40).toFixed(2)}).`);
        nivelBasicoInput.value = (puntajeTotal * 0.40).toFixed(2);
    }

    // 🔴 Nivel Intermedio debe estar entre el Básico y el 70% del puntaje total
    if (nivelIntermedio < nivelBasico || nivelIntermedio > puntajeTotal * 0.80) {
        alert(`⚠️ El nivel Intermedio debe estar entre el Básico y el 70% del puntaje total (${(puntajeTotal * 0.70).toFixed(2)}).`);
        nivelIntermedioInput.value = (puntajeTotal * 0.80).toFixed(2);
    }

    // 🔴 Nivel Alto debe estar entre el intermedio y el puntaje total
    if (nivelAlto < nivelIntermedio || nivelAlto > puntajeTotal) {
        alert(`⚠️ El nivel Alto debe estar entre el Intermedio y el puntaje total (${puntajeTotal.toFixed(2)}).`);
        nivelAltoInput.value = puntajeTotal.toFixed(2);
    }
}
// editar
function setupEditarEvaluacion() {
    const btnEditarEvaluacion = document.getElementById("btnEditarEvaluacion");
    const btnEliminarEvaluacion = document.getElementById("btnEliminarEvaluacion");
    if (!btnEditarEvaluacion || !btnEliminarEvaluacion) {
        console.error(" No se encontró el botón de edición.");
        return;
    }

     // 📌 Evento para eliminar evaluación
    if (btnEliminarEvaluacion) {
        btnEliminarEvaluacion.addEventListener("click", function () {
            eliminarEvaluacion();
        });
    }

    btnEditarEvaluacion.addEventListener("click", function () {
        const modal = document.getElementById("modalVerEvaluacion");
        const buttonContainer = modal.querySelector(".button-container2");
        const estaEditando = btnEditarEvaluacion.classList.contains("modo-edicion");
        const nombreEvaluacionElement = document.querySelector(".evaluacion-nombre");

        if (estaEditando) {
            //  Cancelar edición y eliminar los textareas agregados
            console.log(" Cancelando edición...");
            btnEditarEvaluacion.textContent = "Editar Evaluación";
            btnEditarEvaluacion.classList.remove("modo-edicion");

            if (nombreEvaluacionElement) {
                const input = nombreEvaluacionElement.querySelector("input");
                if (input) {
                    nombreEvaluacionElement.textContent = input.getAttribute("data-original-value");
                }
            }
            // Eliminar botón de guardar cambios
            const btnGuardar = document.getElementById("btnGuardarCambios");
            if (btnGuardar) {
                btnGuardar.remove();
            }

            // Eliminar los textareas sin afectar los tooltips originales
            document.querySelectorAll(".detalle-textarea").forEach(textarea => {
                textarea.remove();
            });

            // Restaurar nombres y puntajes
            document.querySelectorAll(".criterio-nombre, .indicador-nombre, .pregunta-nombre").forEach(element => {
                element.contentEditable = "false";
                element.style.border = "none";
            });

            document.querySelectorAll(".criterio-puntaje, .indicador-puntaje, .pregunta-puntaje").forEach(element => {
                const input = element.querySelector("input");
                if (input) {
                    element.textContent = input.getAttribute("data-original-value");
                }
            });

            document.querySelectorAll(".criterio-nivel-basico, .criterio-nivel-intermedio, .criterio-nivel-alto, .indicador-nivel-basico, .indicador-nivel-intermedio, .indicador-nivel-alto").forEach(input => {
                input.setAttribute("disabled", "true");
                input.style.border = "none";
                input.value = input.getAttribute("data-original-value");
            });

        } else {
            //  Activar modo edición
            console.log(" Modo Edición Activado");
            btnEditarEvaluacion.textContent = "Cancelar";
            btnEditarEvaluacion.classList.add("modo-edicion");

            if (nombreEvaluacionElement) {
                let valorActual = nombreEvaluacionElement.textContent.trim();
                let input = document.createElement("input");
                input.type = "text";
                input.value = valorActual;
                input.setAttribute("data-original-value", valorActual);
                input.style.width = "100%";
                input.style.border = "1px solid blue";
                nombreEvaluacionElement.innerHTML = "";
                nombreEvaluacionElement.appendChild(input);
            }

            // Hacer editables los nombres de criterios, indicadores y preguntas
            document.querySelectorAll(".criterio-nombre, .indicador-nombre, .pregunta-nombre").forEach(element => {
                element.contentEditable = "true";
                element.style.border = "1px solid blue";
            });

            //  Crear un nuevo `<textarea>` debajo de los tooltips para editar los detalles
            document.querySelectorAll(".criterio-detalle-tooltip, .indicador-detalle-tooltip, .pregunta-detalle-tooltip").forEach(element => {
                let valorActual = element.textContent.trim();
                let textarea = document.createElement("textarea");
                textarea.classList.add("detalle-textarea"); // Para identificarlo fácilmente
                textarea.value = valorActual;
                textarea.style.width = "100%";
                textarea.style.height = "60px";
                textarea.style.border = "1px solid blue";
                textarea.style.display = "block";
                textarea.style.marginTop = "5px";
                element.parentNode.insertBefore(textarea, element.nextSibling); // Insertar debajo del tooltip
            });

            // Convertir puntajes en inputs editables
            document.querySelectorAll(".criterio-puntaje, .indicador-puntaje, .pregunta-puntaje").forEach(element => {
                let valorActual = element.textContent.trim();
                let input = document.createElement("input");
                input.type = "number";
                input.value = valorActual ? parseFloat(valorActual) : 1;
                input.setAttribute("data-original-value", valorActual);
                input.classList.add("input-puntaje");
                input.style.width = "50px";
                element.innerHTML = "";
                element.appendChild(input);
            });

            // Hacer editables los niveles de clasificación
            document.querySelectorAll(".criterio-nivel-basico, .criterio-nivel-intermedio, .criterio-nivel-alto, .indicador-nivel-basico, .indicador-nivel-intermedio, .indicador-nivel-alto").forEach(input => {
                input.removeAttribute("disabled");
                input.style.border = "1px solid blue";
                input.setAttribute("data-original-value", input.value);

                //  Validar en tiempo real los niveles
                input.addEventListener("input", function () {
                    validarNivelesEdicion(input);
                });
            });

            
            // Si no existe el botón "Guardar Cambios", crearlo
            if (!document.getElementById("btnGuardarCambios")) {
                let btnGuardar = document.createElement("button");
                btnGuardar.id = "btnGuardarCambios";
                btnGuardar.textContent = "Guardar Cambios";
                btnGuardar.classList.add("btn-guardar");
                buttonContainer.appendChild(btnGuardar);

                btnGuardar.addEventListener("click", function () {
                    const errores = validarEdicionEvaluacion();
                    if (errores.length === 0) {
                        guardarCambiosDetalles();
                        guardarCambiosEvaluacion(); // 🔹 Se llama aquí para que todo se guarde
                    } else {
                        alert(" Corrige los errores antes de guardar:\n" + errores.join("\n"));
                    }
                });
            }
        }
    });
}

//  Función para guardar los cambios de los detalles
function guardarCambiosDetalles() {
    console.log("💾 Guardando cambios en los detalles...");

    document.querySelectorAll(".detalle-textarea").forEach(textarea => {
        let nuevoValor = textarea.value.trim();
        let tooltip = textarea.previousElementSibling; // El tooltip original
        if (tooltip) {
            tooltip.textContent = nuevoValor; // Reemplaza el contenido con el nuevo valor
        }
        textarea.remove(); // Elimina el textarea después de guardar
    });

    // Restaurar el botón "Editar Evaluación"
    const btnEditarEvaluacion = document.getElementById("btnEditarEvaluacion");
    btnEditarEvaluacion.textContent = "Editar Evaluación";
    btnEditarEvaluacion.classList.remove("modo-edicion");

    // Eliminar botón de guardar cambios
    const btnGuardar = document.getElementById("btnGuardarCambios");
    if (btnGuardar) {
        btnGuardar.remove();
    }
}
function guardarCambiosEvaluacion() {
    console.log("💾 Enviando cambios de la evaluación al servidor...");

    const idEvaluacion = document.getElementById("evaluacionSelect")?.value;
    if (!idEvaluacion) {
        alert("⚠️ No se ha seleccionado una evaluación.");
        return;
    }

    // 📌 Obtener el nombre de la evaluación correctamente
    let nombreEvaluacionElement = document.querySelector(".evaluacion-nombre");
    if (!nombreEvaluacionElement) {
        console.error("❌ No se encontró el elemento con la clase 'evaluacion-nombre'.");
        alert("❌ Error: No se pudo encontrar el nombre de la evaluación.");
        return;
    }

    // 📌 Si el nombre está en un input (modo edición), obtener su value
    let nombreEvaluacionInput = nombreEvaluacionElement.querySelector("input");
    const nombreEvaluacion = nombreEvaluacionInput ? nombreEvaluacionInput.value.trim() : nombreEvaluacionElement.textContent.trim();

    if (!nombreEvaluacion) {
        alert("⚠️ El nombre de la evaluación no puede estar vacío.");
        return;
    }

    let criterios = [];
    document.querySelectorAll(".criterio").forEach(criterio => {
        let idCriterio = criterio.getAttribute("data-id");
        if (!idCriterio) {
            console.warn("⚠️ ID del criterio no encontrado:", criterio);
            return;
        }

        let nombreCriterio = criterio.querySelector(".criterio-nombre")?.textContent.trim();
        let detalleCriterio = criterio.querySelector(".criterio-detalle-tooltip")?.textContent.trim() || "";
        let puntajeCriterioInput = criterio.querySelector(".criterio-puntaje input");
        let puntajeCriterio = puntajeCriterioInput ? parseFloat(puntajeCriterioInput.value) : 0;

        let indicadores = [];
        criterio.querySelectorAll(".indicador").forEach(indicador => {
            let idIndicador = indicador.getAttribute("data-id");
            if (!idIndicador) {
                console.warn("⚠️ ID del indicador no encontrado:", indicador);
                return;
            }

            let nombreIndicador = indicador.querySelector(".indicador-nombre")?.textContent.trim();
            let detalleIndicador = indicador.querySelector(".indicador-detalle-tooltip")?.textContent.trim() || "";
            let puntajeIndicadorInput = indicador.querySelector(".indicador-puntaje input");
            let puntajeIndicador = puntajeIndicadorInput ? parseFloat(puntajeIndicadorInput.value) : 0;

            let preguntas = [];
            indicador.querySelectorAll(".pregunta").forEach(pregunta => {
                let idPregunta = pregunta.getAttribute("data-id");
                if (!idPregunta) {
                    console.warn("⚠️ ID de la pregunta no encontrado:", pregunta);
                    return;
                }

                let nombrePregunta = pregunta.querySelector(".pregunta-nombre")?.textContent.trim();
                let detallePregunta = pregunta.querySelector(".pregunta-detalle-tooltip")?.textContent.trim() || "";
                let puntajePreguntaInput = pregunta.querySelector(".pregunta-puntaje input");
                let puntajePregunta = puntajePreguntaInput ? parseFloat(puntajePreguntaInput.value) : 0;

                preguntas.push({ id: idPregunta, nombre: nombrePregunta, detalle: detallePregunta, puntaje: puntajePregunta });
            });

            indicadores.push({ id: idIndicador, nombre: nombreIndicador, detalle: detalleIndicador, puntaje: puntajeIndicador, preguntas });
        });

        criterios.push({ id: idCriterio, nombre: nombreCriterio, detalle: detalleCriterio, puntaje: puntajeCriterio, indicadores });
    });

    console.log("📡 Enviando datos a la API:", { idEvaluacion, nombre: nombreEvaluacion, criterios });

    fetch("/api/editar-evaluacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idEvaluacion, nombre: nombreEvaluacion, criterios }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert("✅ Evaluación actualizada correctamente.");
            // 🔹 Cerrar el modal automáticamente
            document.getElementById("modalVerEvaluacion").style.display = "none";

            // 🔹 Restaurar el botón de edición
            const btnEditarEvaluacion = document.getElementById("btnEditarEvaluacion");
            btnEditarEvaluacion.textContent = "Editar Evaluación";
            btnEditarEvaluacion.classList.remove("modo-edicion");

            // 🔹 Eliminar el botón "Guardar Cambios"
            const btnGuardar = document.getElementById("btnGuardarCambios");
            if (btnGuardar) {
                btnGuardar.remove();
            }
        } else {
            alert(`❌ Error al actualizar: ${data.error}`);
        }
    })
    .catch(error => {
        console.error("❌ Error al actualizar evaluación:", error);
        alert("❌ Hubo un problema al conectar con el servidor.");
    });
}
function eliminarEvaluacion() {
    const idEvaluacion = document.getElementById("evaluacionSelect")?.value;

    if (!idEvaluacion) {
        alert("⚠️ No se ha seleccionado una evaluación para eliminar.");
        return;
    }

    if (!confirm("⚠️ ¿Estás seguro de que deseas eliminar esta evaluación? Esta acción no se puede deshacer.")) {
        return;
    }

    fetch(`/api/eliminar-evaluacion/${idEvaluacion}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert("✅ Evaluación eliminada correctamente.");

            // 🔹 Cerrar el modal automáticamente
            document.getElementById("modalVerEvaluacion").style.display = "none";

            // 🔹 Actualizar la lista de evaluaciones sin recargar la página
            cargarEvaluaciones();
        } else {
            alert(`❌ Error al eliminar la evaluación: ${data.error}`);
        }
    })
    .catch(error => {
        console.error("❌ Error al eliminar evaluación:", error);
        alert("❌ Hubo un problema al conectar con el servidor.");
    });
}
function cargarEvaluaciones() {
    fetch("/api/evaluaciones")
    .then(response => response.json())
    .then(data => {
        if (!data.success) {
            console.error("❌ Error al obtener evaluaciones:", data.error);
            return;
        }

        const evaluacionSelect = document.getElementById("evaluacionSelect");
        evaluacionSelect.innerHTML = '<option value="">-- Seleccionar Evaluación --</option>';

        data.evaluaciones.forEach(evaluacion => {
            const option = document.createElement("option");
            option.value = evaluacion.id;
            option.textContent = evaluacion.nombre;
            option.setAttribute("data-resultado", evaluacion.resultado_aprendizaje);
            option.setAttribute("data-tipo", evaluacion.tipo);
            option.setAttribute("data-id", evaluacion.id); 
            evaluacionSelect.appendChild(option);
        });

        console.log("✅ Lista de evaluaciones actualizada.");
    })
    .catch(error => console.error("❌ Error al obtener evaluaciones:", error));
}
function setupCargarPuntajes() {
    const btnCargarPuntajes = document.getElementById("btnCargarPuntajes");
    const btnSubirPuntajesCSV = document.getElementById("btnSubirPuntajesCSV");
    const btnCerrarModalPuntajes = document.getElementById("btnCerrarModalPuntajes");
    const modalCargarPuntajes = document.getElementById("modalCargarPuntajes");
    const cursoSelect = document.getElementById("cursoSelect");
    const evaluacionSelect = document.getElementById("evaluacionSelect");
    const modalFormatoPuntajesCSV= document.getElementById("modalFormatoPuntajesCSV");
    const btnCerrarModalPunt = document.getElementById("btnCerrarModalPunt");

    if (!btnCargarPuntajes || !btnSubirPuntajesCSV || !btnCerrarModalPuntajes || !modalCargarPuntajes || !cursoSelect || !evaluacionSelect) {
        console.error("🔴 Error: No se encontraron los elementos necesarios para cargar puntajes.");
        return;
    }

    // 📌 Función para abrir el modal
    btnCargarPuntajes.addEventListener("click", function () {
        if (!cursoSelect.value || !evaluacionSelect.value) {
            alert("⚠️ Selecciona un curso y una evaluación antes de cargar los puntajes.");
            return;
        }
        modalCargarPuntajes.style.display = "flex";
        modalFormatoPuntajesCSV.style.display = "flex";
    });

    // 📌 Función para cerrar el modal
    btnCerrarModalPuntajes.addEventListener("click", function () {
        modalCargarPuntajes.style.display = "none";
    });
    btnCerrarModalPunt.addEventListener("click", function () {
        modalFormatoPuntajesCSV.style.display = "none";
    });

    // 📌 Función para procesar el archivo CSV
    btnSubirPuntajesCSV.addEventListener("click", function () {
        const fileInput = document.getElementById("csvPuntajes");
        const file = fileInput.files[0];
        const cursoId = cursoSelect.value;
        const evaluacionId = evaluacionSelect.value;

        if (!file || !cursoId || !evaluacionId) {
            alert("⚠️ Selecciona un archivo CSV, un curso y una evaluación antes de subir.");
            return;
        }

        const formData = new FormData();
        formData.append("csvPuntajes", file);
        formData.append("curso_id", cursoId);
        formData.append("evaluacion_id", evaluacionId);

        fetch("/uploadPuntajesCSV", {
            method: "POST",
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("✅ Puntajes cargados correctamente.");
                modalCargarPuntajes.style.display = "none";
                cargarEstudiantes2(cursoId, evaluacionId); // Refrescar la tabla
            } else {
                alert("❌ Error al cargar puntajes: " + data.error);
            }
        })
        .catch(error => {
            console.error("❌ Error al subir los puntajes:", error);
            alert("Hubo un problema al procesar el archivo.");
        });
    });
}
function setupValidacionResultados() {
    const btnEnviarResultados = document.getElementById("btnEnviarResultados");

    if (!btnEnviarResultados) {
        console.error("❌ Error: No se encontró el botón de enviar resultados.");
        return;
    }

    btnEnviarResultados.addEventListener("click", function () {
        const cursoId = document.getElementById("cursoSelect").value;
        const evaluacionSelect = document.getElementById("evaluacionSelect");
        const evaluacionId = evaluacionSelect.value;
        const tipoEvaluacion = evaluacionSelect.selectedOptions[0].dataset.tipo; // ✅ Corregido

        if (!cursoId || !evaluacionId) {
            alert("⚠️ Selecciona un curso y una evaluación antes de enviar.");
            return;
        }

        // 🔹 Determinar la ruta correcta según el tipo de evaluación
        let url;
        if (tipoEvaluacion === "usuario") {
            url = `/api/evaluacion/personalizada/${evaluacionId}`;
        } else if (tipoEvaluacion === "predeterminada") {
            url = `/api/evaluacion/predeterminada/${evaluacionId}`;
        } else {
            alert("❌ Tipo de evaluación no válido.");
            return;
        }

        // 🔹 Obtener los puntajes máximos permitidos desde la evaluación
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    alert("❌ Error al obtener los puntajes máximos.");
                    return;
                }

                const puntajesMaximos = {}; // Almacena puntajes máximos por pregunta
                const indicadores = {}; // Suma total de puntajes por indicador

                data.preguntas.forEach(p => {
                    puntajesMaximos[p.id_pregunta] = { maximo: p.puntaje, nombre: p.nombre }; // ✅ Guardar nombre y puntaje máximo
                    if (!indicadores[p.id_indLog]) {
                        indicadores[p.id_indLog] = { maximo: 0, suma: 0 };
                    }
                    indicadores[p.id_indLog].maximo += p.puntaje;
                });

                // 🔹 Recorrer la tabla y validar los inputs de las preguntas
                let inputsValidos = true;
                const filas = document.querySelectorAll("#evaluacionTabla tbody tr");

                filas.forEach(fila => {
                    const codigoEstudiante = fila.querySelector("td:nth-child(4)").textContent.trim(); // ✅ Corregido

                    // ✅ Seleccionar todos los inputs (de generación dinámica y BD)
                    const inputs = fila.querySelectorAll(".respuesta, .puntaje-input");
                    if (inputs.length === 0) {
                        console.warn(`⚠️ No hay inputs de puntaje para el estudiante ${codigoEstudiante}.`);
                        return;
                    }

                    inputs.forEach((input, index) => {
                        const preguntaId = data.preguntas[index]?.id_pregunta; // 🔹 Ajustado para coincidir con el orden de preguntas generadas
                        const preguntaNombre = puntajesMaximos[preguntaId]?.nombre || "Desconocida"; // ✅ Obtener el nombre de la pregunta
                        const valor = parseFloat(input.value) || 0;

                        // 🔹 Resetear la clase antes de validar
                        input.classList.remove("input-error");

                        if (!preguntaId || !(preguntaId in puntajesMaximos)) {
                            console.error(`❌ Error: No se encontró un puntaje máximo para la Pregunta "${preguntaNombre}".`);
                            inputsValidos = false;
                            input.classList.add("input-error"); // 🔴 Resaltar en rojo el input con error
                            return;
                        }

                        if (valor < 0 || valor > puntajesMaximos[preguntaId].maximo) {
                            alert(`⚠️ Error: El estudiante ${codigoEstudiante} tiene un puntaje inválido en la Pregunta "${preguntaNombre}". Máximo permitido: ${puntajesMaximos[preguntaId].maximo}.`);
                            inputsValidos = false;
                            input.classList.add("input-error"); // 🔴 Resaltar en rojo el input con error
                            return;
                        }

                        // Sumar puntajes por indicador
                        const indicadorId = data.preguntas.find(p => p.id_pregunta == preguntaId).id_indLog;
                        indicadores[indicadorId].suma += valor;
                    });
                });


                // 🔹 Si todo es válido, enviar los resultados
                if (inputsValidos) {
                    enviarResultados(cursoId, evaluacionId);
                }
            })
            .catch(error => console.error("❌ Error al obtener puntajes máximos:", error));
    });
}

function enviarResultados(cursoId, evaluacionId) {
    const resultados = [];

    // 🔹 Obtener el tipo de evaluación desde el `select` en el frontend
    const evaluacionSelect = document.getElementById("evaluacionSelect");
    const tipoEvaluacion = evaluacionSelect.options[evaluacionSelect.selectedIndex].getAttribute("data-tipo"); // "personalizada" o "predeterminada"

    document.querySelectorAll("#evaluacionTabla tbody tr").forEach(fila => {
        const codigoEstudiante = fila.querySelector("td:nth-child(4)").textContent.trim();
        const puntajes = [];

        //  Seleccionar todos los inputs de puntaje generados dinámicamente
        const inputs = fila.querySelectorAll(".respuesta, .puntaje-input"); // 🔹 Ahora selecciona ambos selectores
        if (inputs.length === 0) {
            console.warn(` No hay inputs de puntaje para el estudiante ${codigoEstudiante}.`);
            return;
        }

        inputs.forEach(input => {
            const valor = parseFloat(input.value) || 0;
            puntajes.push(valor); //  Guardar solo el número, no un objeto
        });

        resultados.push({
            codigo_estudiante: codigoEstudiante,
            curso_id: cursoId,
            evaluacion_id: evaluacionId,
            tipo_evaluacion: tipoEvaluacion, //  Enviar el tipo de evaluación al backend
            puntajes: puntajes
        });
    });

    fetch("/guardarResultados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultados })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(` Resultados enviados correctamente para evaluación ${tipoEvaluacion}.`);
             // 🔹 Luego de enviar los resultados, calcular los niveles
             calcularYGuardarNiveles(cursoId, evaluacionId, tipoEvaluacion);
        } else {
            alert(" Error al guardar los resultados.");
        }
    })
    .catch(error => console.error(" Error al enviar los resultados:", error));
}

// 🔹 Función para calcular y guardar niveles después de enviar resultados
function calcularYGuardarNiveles(cursoId, evaluacionId) {
    const tipoEvaluacion = evaluacionSelect.options[evaluacionSelect.selectedIndex].getAttribute("data-tipo");
    let url = tipoEvaluacion === "usuario"
    ? `/api/calcular-niveles/${cursoId}/${evaluacionId}`
    : `/api/calcular-niveles-predeterminada/${cursoId}/${evaluacionId}`;
    fetch(url)
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(" Niveles de logro calculados y guardados correctamente.");
            console.log(" Datos de niveles:", data.datos);
            console.log(" Trazabilidad:", data.trazabilidad);

            
        } else {
            alert(" Error al calcular los niveles de logro.");
        }
    })
    .catch(error => console.error(" Error al calcular los niveles:", error));
}
