// add hovered class to selected list item
let list = document.querySelectorAll(".navigation li");

function activeLink() {
  list.forEach((item) => {
    item.classList.remove("hovered");
  });
  this.classList.add("hovered");
}

list.forEach((item) => item.addEventListener("mouseover", activeLink));

// Menu Toggle: Colapsar/Expandir la barra lateral
let toggle = document.querySelector(".toggle");
let navigation = document.querySelector(".navigation");
let dynamicContent = document.querySelector("#dynamicContent"); // Si es el contenedor principal, puedes cambiarlo a #dynamicContent si es necesario

toggle.onclick = function () {
  // Alternar la clase 'active' en la barra lateral
  navigation.classList.toggle("active");
  
  // Alternar la clase 'active' en el contenido principal para que se ajuste
  dynamicContent.classList.toggle("active");
  toggle.classList.toggle("active");
};

// Mantener la clase 'active' en los botones del menú
const buttons = document.querySelectorAll('.icon-btn');
buttons.forEach(button => {
  button.addEventListener('click', () => {
    // Remover la clase 'active' de todos los botones
    buttons.forEach(btn => btn.classList.remove('active'));

    // Agregar la clase 'active' al botón que fue clicado
    button.classList.add('active');
  });
});



