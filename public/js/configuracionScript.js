document.addEventListener("DOMContentLoaded", () => {
    const dynamicContent = document.getElementById("dynamicContent");

    if (!dynamicContent) {
        console.error("El contenedor dinámico 'dynamicContent' no se encuentra.");
        return;
    }
    // Función para cargar configuración al hacer clic en un botón
    document.getElementById("btnConfiguracion")?.addEventListener("click", () => {
        loadConfiguracion();
    });
    // === Editar Perfil ===
    dynamicContent.addEventListener("click", (event) => {
        const target = event.target;
        if (target.id === "btnEditarPerfil") {
            openModal();
        }
    });

    const openModal = () => {
        const modalEditarPerfil = document.getElementById("modalEditarPerfil");
        if (modalEditarPerfil) {
            modalEditarPerfil.style.display = "block";
        }
    };

    dynamicContent.addEventListener("click", (event) => {
        const target = event.target;
        if (target.classList.contains("close")) {
            closeModal();
        }
    });

    const closeModal = () => {
        const modalEditarPerfil = document.getElementById("modalEditarPerfil");
        if (modalEditarPerfil) {
            modalEditarPerfil.style.display = "none";
        }
    };

    // === Manejar el formulario de actualización de perfil ===
    const setupFormHandler = () => {
        const form = document.getElementById("configForm");
    
        if (form) {
            form.addEventListener("submit", function (event) {
                event.preventDefault();
    
                const formData = new FormData(form);
    
                fetch("/updateProfile", {
                    method: "POST",
                    body: formData,
                })
                    .then((response) => {
                        if (!response.ok) {
                            throw new Error("Error en la respuesta del servidor");
                        }
                        return response.json();
                    })
                    .then((data) => {
                        if (data.success) {
                            
                            document.getElementById("nombreUsuario").value = data.datos.nombreUsuario;
                            document.getElementById("correo").value = data.datos.correo1;
                            document.getElementById("nombreCompleto").value = data.datos.nombreC;
                            document.getElementById("fotoPerfil").src = `/public${data.datos.fotoPerfil}?t=${new Date().getTime()}`;
                            window.location.href = "/dashboard?section=configuracion&status=success";
                            alert("Perfil actualizado con éxito ✅");

                        } else {
                            alert(`Error: ${data.error}`);
                        }
                    })
                    .catch((error) => {
                        console.error("Error al actualizar el perfil:", error);
                        alert("Ocurrió un error al intentar actualizar el perfil.");
                    });
            });
    
            console.log("✅ Formulario enlazado correctamente para configuración.");
        } else {
            console.error("❌ Formulario de configuración no encontrado.");
        }
    };
    

    // === Cambiar Contraseña ===
    dynamicContent.addEventListener("click", (event) => {
        const target = event.target;
        if (target.id === "btnCambiarContraseña") {
            openChangePasswordModal();
        }
    });

    const openChangePasswordModal = () => {
        const modalCambiarContraseña = document.getElementById("modalCambiarContraseña");
        if (modalCambiarContraseña) {
            modalCambiarContraseña.style.display = "block";
        }
    };

    document.addEventListener("click", (event) => {
        const target = event.target;
        if (target.id === "closeModalContraseña" || target.classList.contains("close")) {
            closeChangePasswordModal();
        }
    });

    const closeChangePasswordModal = () => {
        const modalCambiarContraseña = document.getElementById("modalCambiarContraseña");
        if (modalCambiarContraseña) {
            modalCambiarContraseña.style.display = "none";
        }
    };

    // === Manejar el formulario de cambiar contraseña ===
    const setupChangePasswordHandler = () => {
        const changePasswordForm = document.getElementById("changePasswordForm");

        if (changePasswordForm) {
            changePasswordForm.addEventListener("submit", function (event) {
                event.preventDefault();

                const oldPassword = document.getElementById("oldPassword").value;
                const newPassword = document.getElementById("newPassword").value;
                const confirmPassword = document.getElementById("confirmPassword").value;

                console.log("🔍 Datos enviados desde el frontend:", { oldPassword, newPassword, confirmPassword });

                fetch("/changePassword", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ oldPassword, newPassword, confirmPassword }),
                })
                    .then((response) => response.json())
                    .then((data) => {
                        if (data.success) {
                            alert("¡Contraseña actualizada correctamente!");
                            closeChangePasswordModal();
                        } else {
                            alert(`Error: ${data.error}`);
                        }
                    })
                    .catch((error) => {
                        console.error("Error al cambiar la contraseña:", error);
                        alert("Ocurrió un error al intentar cambiar la contraseña.");
                    });
            });
            console.log("✅ Formulario enlazado correctamente para cambiar contraseña.");
        } else {
            console.error("❌ Formulario de cambio de contraseña no encontrado.");
        }
    };

    // === Cargar Configuración Dinámicamente ===
    const loadConfiguracion = () => {
        fetch("/configuracion")
            .then((response) => response.text())
            .then((html) => {
                dynamicContent.innerHTML = html;
                setupFormHandler();
                setTimeout(() => {
                    if (document.getElementById("changePasswordForm")) {
                        setupChangePasswordHandler();
                    } else {
                        console.error("❌ Formulario de cambio de contraseña no encontrado después de cargar la configuración.");
                    }
                }, 500);
            })
            .catch((error) => console.error("Error cargando configuración:", error));
    };

    // === Detectar si se debe cargar la configuración automáticamente ===
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get("section");
    const status = urlParams.get("status");

    if (section === "configuracion") {
        loadConfiguracion();

        if (status === "success") {
            alert("¡Perfil actualizado correctamente!");
            document.getElementById("btnConfiguracion")?.click();
        } else if (status === "error") {
            alert("Ocurrió un error al actualizar el perfil.");
        }
        window.history.replaceState({}, document.title, "/dashboard?section=configuracion");
    }
});
