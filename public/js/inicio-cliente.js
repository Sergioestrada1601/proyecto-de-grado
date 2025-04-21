// public/js/inicio-cliente.js
console.log(' inicio-cliente.js cargado');

const _infoContentData = {
    quienes: {
        title: '¿Quiénes Somos?',
        text: `
        <p style="text-align: justify;">
            Somos <strong>Sergio Estrada Castro</strong> y <strong>Juan Camilo Gonzales</strong>, desarrolladores de software apasionados por la tecnología, la innovación y el aprendizaje continuo. Estudiantes de la Universidad del Valle, actualmente nos encontramos inmersos en la culminación de nuestra carrera profesional a través de este proyecto de grado, el cual refleja no solo nuestros conocimientos técnicos, sino también nuestro compromiso con la educación y el impacto social.
        </p>
        <p style="text-align: justify;">
            Este proyecto nace de la motivación por contribuir al fortalecimiento del pensamiento computacional en los estudiantes de educación secundaria, desarrollando herramientas tecnológicas accesibles, intuitivas y significativas. A lo largo de este camino, hemos enfrentado desafíos que nos han impulsado a investigar, colaborar, y crecer como profesionales y como personas.
        </p>
        <p style="text-align: justify;">
            Nos destacamos por ser:
        </p>
        <ul style="text-align: justify; padding-left: 20px;">
            <li><strong>Disciplinados:</strong> mantenemos una ética de trabajo constante y organizada.</li>
            <li><strong>Orientados al detalle:</strong> cuidamos cada línea de código, diseño y experiencia de usuario.</li>
            <li><strong>Responsables:</strong> asumimos cada reto con profesionalismo y enfoque.</li>
            <li><strong>Colaborativos:</strong> creemos en la fuerza del trabajo en equipo y el aprendizaje compartido.</li>
            <li><strong>Apasionados:</strong> nos mueve el deseo de crear soluciones que dejen huella.</li>
        </ul>
        <p style="text-align: justify;">
            Agradecemos a todos quienes han hecho parte de este proceso, y esperamos que esta aplicación sea de gran valor para docentes, estudiantes y cualquier persona interesada en el desarrollo del pensamiento computacional.
        </p>
        `,
        pdf: false
    },
      
  objetivo: {
    title: 'Nuestros Objetivos',
    text: `
      <h1> Objetivo general </h1>
      <p style="text-align: justify;"> Implementar un prototipo de aplicación web que permita evaluar y dar seguimiento a competencias de pensamiento computacional en estudiantes de educación secundaria.</p>
      <h2> Objetivos especificos </h2>
      <ul style="text-align: justify; padding-left: 20px;">
            <li><strong>Analizar</strong> el método de evaluación de competencias en Pensamiento Computacional que se va a incorporar. </li>
            <li><strong>Diseñar</strong> la estructura del método de evaluación a implementar.</li>
            <li><strong>Desarrollar</strong> el prototipo de aplicación web que incorpore el método de evaluación de las competencias en Pensamiento computacional. </li>
            <li><strong>Realizar</strong> pruebas de usabilidad a la aplicación implementada.</li>
        </ul>
    `,
    pdf: false
  },
  funcionamiento: {
    title: 'Funcionamiento de la Aplicación',
    text: `
      <p>La aplicación ofrece:</p>
      <ul>
        <li>Creacion de usuarios, y registro de cada uno de los cursos a evaluar</li>
        <li>Generar o modificar la evaluacion predeterminada para realizar a los cursos </li>
        <li>Panel de configuración personalizado para cada evaluacion a generar</li>
      </ul>
      <h2>Para más detalles, consulta el documento técnico:</h2>
    `,
    pdf: true
  }
};

function setupInicioCards() {
  console.log('🔧 setupInicioCards invocado');
  const cards = document.querySelectorAll('.info-card');
  const infoContentDiv = document.getElementById('infoContent');
  const infoTitle = document.getElementById('infoTitle');
  const infoText = document.getElementById('infoText');
  const pdfContainer = document.getElementById('pdfContainer');

  if (!cards.length) {
    console.warn('⚠️ No hay .info-card en esta página');
    return;
  }

  cards.forEach(card => {
    card.addEventListener('click', () => {
      const key = card.getAttribute('data-info');
      const content = _infoContentData[key];
      console.log('🔘 Click en:', key);

      infoTitle.textContent = content.title;
      infoText.innerHTML  = content.text;
      pdfContainer.style.display = content.pdf ? 'block' : 'none';
      infoContentDiv.style.display = 'block';
    });
  });
}

// Hacemos la función disponible globalmente
window.setupInicioCards = setupInicioCards;
