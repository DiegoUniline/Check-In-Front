import LegalLayout from "./LegalLayout";
import { LEGAL } from "@/marketing/lib/legal";

export default function Seguridad() {
  return (
    <LegalLayout
      title="Política de Seguridad de la Información"
      description="Medidas administrativas, técnicas y físicas que VULO aplica para proteger la información de los hoteles y de sus huéspedes."
      updated={LEGAL.actualizado}
    >
      <p>
        Esta política describe las medidas de seguridad que{" "}
        <strong>{LEGAL.titular}</strong> (VULO) aplica para proteger la información de sus clientes,
        en cumplimiento del artículo 18 de la Ley Federal de Protección de Datos Personales en
        Posesión de los Particulares publicada en el DOF el 20 de marzo de 2025. Se describe
        únicamente lo que la plataforma efectivamente implementa hoy.
      </p>

      <h2>1. Arquitectura y hospedaje</h2>
      <ul>
        <li>
          VULO opera sobre infraestructura administrada en la nube: base de datos, autenticación,
          almacenamiento de archivos y funciones de servidor.
        </li>
        <li>
          La plataforma no se ejecuta en servidores propios del cliente; el mantenimiento del
          hardware y de la capa de red corresponde al proveedor de infraestructura.
        </li>
        <li>
          Los datos de cada hotel están separados de forma lógica mediante un identificador de
          hotel, aplicado en el propio motor de base de datos.
        </li>
      </ul>

      <h2>2. Cifrado</h2>
      <ul>
        <li>
          <strong>En tránsito:</strong> todo el tráfico entre el navegador y la plataforma viaja
          sobre HTTPS con certificado TLS válido.
        </li>
        <li>
          <strong>En reposo:</strong> la información se almacena en servicios de base de datos y de
          archivos administrados que aplican cifrado de disco por parte del proveedor de
          infraestructura.
        </li>
        <li>
          <strong>Contraseñas:</strong> nunca se almacenan en texto claro; el proveedor de
          autenticación las guarda con funciones de derivación de clave (hash + salt) y VULO no
          tiene acceso a ellas.
        </li>
      </ul>

      <h2>3. Control de acceso</h2>
      <ul>
        <li>Acceso mediante correo y contraseña, con sesiones firmadas y con expiración.</li>
        <li>Opción de inicio de sesión con Google.</li>
        <li>
          <strong>Roles y permisos:</strong> Administrador, Gerente, Recepción, Limpieza y
          Mantenimiento, con permisos por módulo. Cada rol ve únicamente lo necesario para su
          función.
        </li>
        <li>
          <strong>Seguridad a nivel de fila:</strong> las políticas se aplican directamente en la
          base de datos, de modo que una consulta no autorizada no devuelve información de otro
          hotel, incluso si se intentara desde fuera de la interfaz.
        </li>
        <li>
          Los roles se almacenan en una tabla independiente y se validan del lado del servidor;
          nunca se determinan a partir de información guardada en el navegador.
        </li>
      </ul>

      <h2>4. Pagos: VULO no procesa tarjetas</h2>
      <p>
        La suscripción se paga por transferencia electrónica o depósito bancario. VULO{" "}
        <strong>no captura, no transmite y no almacena números de tarjeta, CVV ni credenciales
        bancarias</strong>, por lo que estos datos no existen dentro de la plataforma.
      </p>

      <h2>5. Respaldos y continuidad</h2>
      <ul>
        <li>
          La base de datos cuenta con los respaldos automáticos que ofrece el proveedor de
          infraestructura administrada.
        </li>
        <li>
          Adicionalmente, la plataforma permite al cliente{" "}
          <strong>exportar a Excel la información de cualquier módulo</strong> (reservas, clientes,
          habitaciones, inventarios, compras, pagos y reportes), de modo que siempre pueda mantener
          su propia copia.
        </li>
        <li>
          Recomendamos a cada hotel realizar exportaciones periódicas como respaldo bajo su propio
          control.
        </li>
      </ul>

      <h2>6. Registro de actividad</h2>
      <ul>
        <li>
          La plataforma conserva bitácora de operaciones relevantes: creación y modificación de
          reservas, movimientos de caja, cambios de estatus de habitaciones y bitácora de turnos.
        </li>
        <li>
          El módulo de <strong>Turnos</strong> permite documentar la entrega entre recepcionistas,
          con responsable, hora y observaciones.
        </li>
        <li>
          Los registros técnicos de acceso y de ejecución de funciones de servidor se conservan
          conforme a la retención del proveedor de infraestructura.
        </li>
      </ul>

      <h2>7. Desarrollo y cambios</h2>
      <ul>
        <li>Los cambios se despliegan de forma controlada y versionada.</li>
        <li>Las claves y credenciales de servicios externos se administran como secretos del entorno y no se incluyen en el código del cliente.</li>
        <li>Se realizan revisiones periódicas de las políticas de acceso a la base de datos.</li>
      </ul>

      <h2>8. Terceros que participan en el servicio</h2>
      <p>
        Para operar, VULO utiliza proveedores que actúan como encargados del tratamiento:
        infraestructura y base de datos en la nube, envío de correo transaccional, mensajería por
        WhatsApp y servicios de inteligencia artificial para el asistente automatizado. Cada uno
        recibe únicamente la información necesaria para su función.
      </p>

      <h2>9. Gestión de incidentes</h2>
      <ul>
        <li>
          Ante un incidente de seguridad se contiene el evento, se evalúa el alcance y se corrige la
          causa.
        </li>
        <li>
          Si la vulneración afecta de forma significativa los derechos patrimoniales o morales de
          las personas titulares, se les informa <strong>de forma inmediata</strong>, conforme al
          artículo 19 de la Ley.
        </li>
        <li>
          El aviso incluye la naturaleza del incidente, los datos comprometidos, las
          recomendaciones aplicables y las acciones correctivas realizadas.
        </li>
      </ul>

      <h2>10. Responsabilidades del hotel</h2>
      <p>La seguridad es compartida. Corresponde a cada hotel:</p>
      <ul>
        <li>Usar contraseñas robustas y no compartirlas entre personas.</li>
        <li>Crear un usuario por persona y asignar el rol mínimo necesario.</li>
        <li>Dar de baja de inmediato a los usuarios que dejen de laborar.</li>
        <li>Cerrar sesión en equipos compartidos de recepción.</li>
        <li>Mantener el sistema operativo y el navegador actualizados.</li>
        <li>Exportar respaldos periódicos de su información.</li>
      </ul>

      <h2>11. Reporte de vulnerabilidades</h2>
      <p>
        Si identifica una vulnerabilidad, le pedimos reportarla de forma responsable a{" "}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> con el asunto{" "}
        <strong>"Reporte de seguridad"</strong>, incluyendo la descripción y los pasos para
        reproducirla. Los reportes se atienden en horario de <strong>{LEGAL.horario}</strong>. Le
        solicitamos no divulgar públicamente el hallazgo hasta que haya sido corregido y no acceder
        a información de terceros durante sus pruebas.
      </p>

      <h2>12. Contacto</h2>
      <p>
        <strong>{LEGAL.titular}</strong> · RFC {LEGAL.rfc} · {LEGAL.domicilio} ·{" "}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> · WhatsApp{" "}
        <a href={LEGAL.whatsapp} target="_blank" rel="noreferrer">{LEGAL.telefono}</a>.
      </p>
      <p>
        <strong>Última actualización:</strong> {LEGAL.actualizado}.
      </p>
    </LegalLayout>
  );
}
