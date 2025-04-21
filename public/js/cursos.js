document.addEventListener("DOMContentLoaded", (event) => {
    const dynamicContent = document.getElementById("dynamicContent");
    if (dynamicContent) {
        dynamicContent.addEventListener("click", function (event) {
            const target = event.target;
            if (target.id === "addCourseBtn" || target.closest("#addCourseBtn")) {
                openModal();
            }
        });

        dynamicContent.addEventListener("click", function (event) {
            if (event.target && event.target.classList.contains("close")) {
                closeModal();
            }
        });
        // Delegación de eventos para el botón de subir CSV
        dynamicContent.addEventListener("click", function (event) {
            const target = event.target;
            if (target.id === "uploadCSVBtn" || target.closest("#uploadCSVBtn")) {
                subirCSV();
            }
        });
       
        document.getElementById("btnCursos")?.addEventListener("click", () => {
            loadCursos();
        });
        // Delegación de eventos para el botón "Añadir Estudiantes" y "editar curso"
        
        
        // Delegación de eventos para el botón "Guardar Estudiante"
        dynamicContent.addEventListener("click", function (event) {
            if (event.target.id === "saveStudentBtn") {
                const studentCode = document.getElementById("studentCode")?.value.trim();
                const studentName = document.getElementById("studentName")?.value.trim();
                const studentAge = document.getElementById("studentAge")?.value.trim();
                const studentEmail = document.getElementById("studentEmail")?.value.trim();
                const cursoId = document.getElementById("selectedCourseId")?.value.trim();

                console.log("Código:", studentCode);
                console.log("Nombre:", studentName);
                console.log("Edad:", studentAge);
                console.log("Email:", studentEmail);
                console.log("Curso ID:", cursoId);

                if (!studentCode || !studentName || !studentAge || !studentEmail || !cursoId) {
                    alert("Todos los campos son obligatorios. ");
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
                    .then((response) => response.json())
                    .then((data) => {
                        if (data.message) {
                            alert("Estudiante agregado correctamente.");
                            document.getElementById("studentCode").value = "";
                            document.getElementById("studentName").value = "";
                            document.getElementById("studentAge").value = "";
                            document.getElementById("studentEmail").value = "";

                            // 🔥 Actualizar la cantidad de estudiantes en la tarjeta del curso sin recargar
                            actualizarContadorEstudiantes(cursoId);
                        } else {
                            alert("Error al agregar estudiante.");
                        }
                    })
                    .catch((error) => {
                        console.error("Error al agregar estudiante:", error);
                        alert("Hubo un problema al agregar el estudiante.");
                    });
            }
        });
    }
    document.getElementById("finishStudentBtn").addEventListener("click", function () {
        document.getElementById("addStudentModal").style.display = "none";
        document.getElementById("addStudentForm").reset();
    });
    
    
    // Manejo de formularios
    const addCourseForm = document.getElementById("addCourseForm");
    if (addCourseForm) {
        addCourseForm.addEventListener("submit", function (event) {
            event.preventDefault();
            const nombreCurso = document.getElementById("nombre_curso").value;
            const colegio = document.getElementById("colegio").value;

            fetch("/addCourse", {  // 🔹 Ruta corta
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre_curso: nombreCurso, colegio: colegio }),
            })
                .then((response) => {
                    if (response.ok) {
                        window.location.href = "/cursos";
                    } else {
                        return response.json();
                    }
                })
                .then((data) => {
                    if (data && data.error) {
                        alert(`Error: ${data.error}`);
                    }
                })
                .catch((error) => {
                    console.error("Error en la petición:", error);
                });
        });
    }
});

function subirCSV() {
    const fileInput = document.getElementById("csvFile");
    const cursoSelect = document.getElementById("selectedCourseId");
    const file = fileInput.files[0];
    const cursoId = cursoSelect.value;

    if (!file || !cursoId) {
        alert("⚠️ Selecciona un archivo CSV y un curso antes de subir.");
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
            alert("✅ Estudiantes agregados correctamente.");
            closeModal();
            loadCursos();
        } else {
            alert("❌ Error al agregar estudiantes: " + data.error);
        }
    })
    .catch(error => {
        console.error("❌ Error al subir el CSV:", error);
        alert("Hubo un problema al procesar el archivo.");
    });
}
// Función para cargar la sección de Cursos dinámicamente
function loadCursos() {
    fetch("/cursos")  // Llama a la ruta /cursos
        .then(response => response.text())
        .then(html => {
            document.getElementById("dynamicContent").innerHTML = html;  // Inserta el HTML en el contenido dinámico
            setupCourseMenu();
            setupEditCourseHandler();
            
        })
        .catch(error => console.error('Error cargando cursos:', error));
}
 // Detectar si la URL tiene el parámetro 'section=cursos'
 const urlParams = new URLSearchParams(window.location.search);
 const section = urlParams.get('section');
 const status = urlParams.get('status');
if (section === 'cursos') {
    loadCursos();  // Cargar la sección de Cursos automáticamente
}
// Función para abrir el modal
function openModal() {
    const modal = document.getElementById("addCourseModal");
    if (modal) {
        modal.style.display = "block";
    }
}

// Función para cerrar el modal
function closeModal() {
    const modal = document.getElementById("addCourseModal");
    if (modal) {
        modal.style.display = "none";
    }
}
function setupEditCourseHandler() {
    const editCourseForm = document.getElementById("editCourseForm");

    if (editCourseForm) {
        console.log("📌 Formulario de edición encontrado. Asignando evento submit...");
        
        editCourseForm.addEventListener("submit", function (event) {
            event.preventDefault();
            const cursoId = document.getElementById("editCursoId").value.trim();
            const nombreCurso = document.getElementById("editNombreCurso").value.trim();
            const colegio = document.getElementById("editColegio").value.trim();

            console.log("Código:", cursoId);
            
            if (!cursoId || !nombreCurso || !colegio) {
                alert("Por favor, completa todos los campos.");
                return;
            }

            console.log("✉️ Enviando datos:", { curso_id: cursoId, nombre_curso: nombreCurso, colegio: colegio });

            fetch(`/editCourse`, {  
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ curso_id: cursoId, nombre_curso: nombreCurso, colegio: colegio }),
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.message) {
                        alert("Curso actualizado exitosamente");
                        closeModal2();
                        loadCursos();
                    } else {
                        alert("Error al actualizar el curso");
                    }
                })
                .catch((error) => {
                    console.error("Error actualizando el curso:", error);
                    alert("Hubo un problema al actualizar el curso.");
                });
        });
    } else {
        console.error("❌ No se encontró el formulario de edición en el DOM.");
    }
}

function setupCourseMenu() {
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', function (event) {
            // Obtener el menú de opciones asociado a la card
            const menu = this.querySelector('.menu-opciones');
  
            // Alternar la visibilidad del menú
            if (menu.style.display === 'none' || menu.style.display === '') {
                // Ocultar todos los demás menús abiertos
                document.querySelectorAll('.menu-opciones').forEach(m => {
                    m.style.display = 'none';
                });
  
                // Mostrar el menú de la card actual
                menu.style.display = 'block';
            } else {
                menu.style.display = 'none';
            }
  
            // Detener la propagación para que no se cierre el menú si haces clic dentro de él
            event.stopPropagation();
        });
    });
  
    // Cerrar el menú si se hace clic fuera de una card
    document.addEventListener('click', function () {
        document.querySelectorAll('.menu-opciones').forEach(menu => {
            menu.style.display = 'none';
        });
    });
  
    // Agregar eventos a las opciones del menú
    document.querySelectorAll('.menu-opciones .opcion').forEach(opcion => {
        opcion.addEventListener('click', function (event) {
            const action = this.getAttribute('data-action');
            const cursoId = this.closest('.card').getAttribute('data-curso-id');
            const cursoNombre = this.closest('.card').getAttribute('data-curso-nombre');
            const cursoColegio = this.closest('.card').getAttribute('data-curso-colegio');
            switch (action) {
                case 'add-students':
                    const modalFormatoEstCSV = document.getElementById('modalFormatoEstCSV');
                    if (!modalFormatoEstCSV) {
                        console.error("Modal 'modalFormatoEstCSV' no encontrado.");
                    } else {
                        console.error("Modal 'modalFormatoEstCSV'  encontrado.");
                        modalFormatoEstCSV.style.display = 'flex';
                    }
                    document.getElementById('addStudentModal').style.display = 'block';

                    // Guardamos el cursoId en una variable para usarlo al enviar los estudiantes
                    document.getElementById('selectedCourseId').value = cursoId;
                    
                    alert('Añadir estudiantes al curso ' + cursoNombre);
                    break;
                case 'show-students':
                    const studentModal = document.getElementById("studentListModal");
                    const studentTableBody = document.getElementById("studentListTableBody");
                    const btnEliminarSeleccionados = document.getElementById("btnEliminarSeleccionados");
                    studentModal.dataset.cursoId = cursoId;
                    studentTableBody.innerHTML = "<tr><td colspan='4'>Cargando...</td></tr>";
                    
                    fetch(`/api/estudiantes?curso_id=${cursoId}`)
                        .then(response => response.json())
                        .then(data => {
                            studentTableBody.innerHTML = ""; 
                    
                            if (data.success && data.estudiantes.length > 0) {
                                data.estudiantes.forEach((estudiante, index) => {
                                    const row = `<tr>
                                                    <td>${index + 1}</td>
                                                    <td><input type="checkbox" class="seleccionar-estudiante" data-codigo="${estudiante.codigo_estudiante}"></td>
                                                    <td>${estudiante.codigo_estudiante}</td>
                                                    <td>${estudiante.nombre_estudiante}</td>
                                                </tr>`;
                                    studentTableBody.innerHTML += row;
                                });
                    
                                // Activar evento para chequear selección
                                document.querySelectorAll(".seleccionar-estudiante").forEach(checkbox => {
                                    checkbox.addEventListener("change", function () {
                                        const seleccionados = document.querySelectorAll(".seleccionar-estudiante:checked");
                                        btnEliminarSeleccionados.disabled = seleccionados.length === 0;
                                    });
                                });
                    
                                btnEliminarSeleccionados.addEventListener("click", function () {
                                    eliminarEstudiantesSeleccionados();
                                });
                    
                            } else {
                                studentTableBody.innerHTML = "<tr><td colspan='4'>No hay estudiantes en este curso</td></tr>";
                            }
                        })
                        .catch(error => {
                            console.error("Error al obtener estudiantes:", error);
                            studentTableBody.innerHTML = "<tr><td colspan='4'>Error al cargar estudiantes</td></tr>";
                        });
                    
                    studentModal.style.display = "block";
                    break;                    
                case 'edit':
                    document.getElementById('editCourseModal').style.display = 'block';
                    // Rellenar el modal con los datos actuales del curso
                    document.getElementById('editCursoId').value = cursoId;
                    document.getElementById('editNombreCurso').value = cursoNombre;
                    document.getElementById('editColegio').value = cursoColegio;
                
                    // Mostrar el modal
                    
                    alert('Editar el curso ' + cursoNombre);
                    break;  
                case 'delete':
                    const confirmDelete = confirm('¿Estás seguro de eliminar el curso ' + cursoNombre + '?');
                    if (confirmDelete) {
                        // Enviar petición al servidor para eliminar el curso
                        fetch(`/deleteCourse/${cursoId}`, {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json',
                            }
                        })
                        .then(response => {
                            if (response.ok) {
                                // Eliminar la card del DOM si la eliminación fue exitosa
                                this.closest('.card').remove();
                                alert('Curso eliminado exitosamente');
                            } else {
                                alert('Error al eliminar el curso');
                            }
                        })
                        .catch(error => {
                            console.error('Error eliminando el curso:', error);
                            alert('Hubo un problema al eliminar el curso');
                        });
                    }
                    break;
                case 'duplicate':  // 🔥 Nueva opción para duplicar el curso
                    if (confirm('¿Seguro que deseas duplicar este curso?')) {
                        fetch(`/duplicateCourse/${cursoId}`, { method: "POST", headers: { "Content-Type": "application/json" } })
                        .then(response => response.json())
                        .then(data => {
                            if (data.error) {
                                alert("❌ Error al duplicar curso.");
                                return;
                            }

                            alert("✅ Curso duplicado correctamente.");
                            agregarCursoUI(data.curso);
                        })
                        .catch(error => console.error("❌ Error al duplicar curso:", error));
                    }
                    break;
                }
  
            // Evitar que el menú se cierre al hacer clic en una opción
            event.stopPropagation();
        });
    });
  }
function closeModal2() {
    const modal = document.getElementById("editCourseModal");
    if (modal) {
        modal.style.display = "none";
    }
}
function closeStudentModal() {
    const modal = document.getElementById("addStudentModal");
    if (modal) {
        modal.style.display = "none";
    }
}
function closeStudentModal2() {
    const modal = document.getElementById("modalFormatoEstCSV");
    if (modal) {
        modal.style.display = "none";
    }
}
// Función para mostrar el toast
function showToast(message) {
    const toast = document.getElementById("toast");
    toast.innerText = message;
    toast.classList.add("show");
    setTimeout(function () {
        toast.classList.remove("show");
    }, 3000);  // Mostrar el toast por 3 segundos
}
// 📌 Función para actualizar el contador de estudiantes en la tarjeta sin recargar la página
function actualizarContadorEstudiantes(cursoId) {
    fetch(`/api/estudiantes?curso_id=${cursoId}`)
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                console.error("❌ Error al obtener la cantidad de estudiantes:", data.error);
                return;
            }

            const contador = document.querySelector(`.students-count[data-curso-id='${cursoId}']`);
            if (contador) {
                contador.textContent = data.estudiantes.length; // ✅ Actualiza el número de estudiantes en la tarjeta
            }
        })
        .catch(error => console.error("❌ Error al actualizar contador de estudiantes:", error));
}
function agregarCursoUI(curso) {
    const cardBox = document.querySelector(".cardBox");

    const nuevaCard = document.createElement("div");
    nuevaCard.classList.add("card");
    nuevaCard.dataset.cursoId = curso.curso_id;
    nuevaCard.dataset.cursoNombre = curso.nombre_curso;
    nuevaCard.dataset.cursoColegio = curso.colegio;

    nuevaCard.innerHTML = `
        <div>
            <div class="numbers">${curso.nombre_curso}</div>
            <div class="cardName">Institución: ${curso.colegio}</div>
            <div class="students-count">
                <ion-icon name="people-outline"></ion-icon> Estudiantes: <span class="students-count" data-curso-id="${curso.curso_id}">0</span>
            </div>
        </div>
        <div class="iconBx">
            <ion-icon name="book-outline"></ion-icon>
        </div>
        <div class="menu-opciones" style="display: none;">
            <button class="opcion" data-action="add-students">Añadir estudiantes</button>
            <button class="opcion" data-action="show-students">Mostrar Estudiantes</button>
            <button class="opcion" data-action="edit">Editar curso</button>
            <button class="opcion" data-action="delete">Eliminar curso</button>
            <button class="opcion" data-action="duplicate">Duplicar curso</button>
        </div>
    `;

    cardBox.appendChild(nuevaCard);
    setupCourseMenu(); // ✅ Reaplicar eventos al nuevo curso agregado dinámicamente
}
function closeStudentListModal() {
    document.getElementById("studentListModal").style.display = "none";
}
function eliminarEstudiantesSeleccionados() {
    let seleccionados = document.querySelectorAll(".seleccionar-estudiante:checked");

    if (seleccionados.length === 0) {
        alert("⚠️ No hay estudiantes seleccionados para eliminar.");
        return;
    }

    if (!confirm(`¿Seguro que deseas eliminar ${seleccionados.length} estudiante(s)?`)) {
        return;
    }

    let estudiantesAEliminar = Array.from(seleccionados).map(checkbox => checkbox.dataset.codigo);
    let cursoId = document.getElementById("studentListModal").dataset.cursoId; // 🔹 Tomamos el curso actual

    fetch("/deleteStudent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estudiantes: estudiantesAEliminar, curso_id: cursoId }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert("✅ Estudiantes eliminados correctamente.");
            seleccionados.forEach(checkbox => checkbox.closest("tr").remove());
            document.getElementById("btnEliminarSeleccionados").disabled = true;
        } else {
            alert("❌ Error al eliminar estudiantes: " + data.error);
        }
    })
    .catch(error => console.error("❌ Error al eliminar estudiantes:", error));
}
