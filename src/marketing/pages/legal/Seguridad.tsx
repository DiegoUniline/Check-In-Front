import LegalLayout from "./LegalLayout";

export default function Seguridad() {
  return (
    <LegalLayout
      title="Política de Seguridad"
      description="Prácticas de seguridad, infraestructura y respuesta a incidentes que VULO aplica para proteger su información."
      updated="21 de julio de 2026"
    >
      <p>
        Esta página describe las prácticas de seguridad que <strong>Uniline Innovación en la
        Nube</strong> aplica en la plataforma <strong>VULO</strong>. Es un documento informativo
        editable mantenido por el propietario de la aplicación y no constituye una certificación
        independiente.
      </p>

      <h2>1. Infraestructura</h2>
      <ul>
        <li>Servicio alojado en infraestructura en la nube de proveedores con estándares reconocidos internacionalmente (ISO 27001, SOC 2 en su caso).</li>
        <li>Servidores ubicados en regiones con redundancia y alta disponibilidad.</li>
        <li>Cifrado en tránsito con <strong>TLS 1.2+</strong> y en reposo con <strong>AES-256</strong>.</li>
        <li>Respaldos automáticos diarios con retención de 30 días.</li>
      </ul>

      <h2>2. Aislamiento multi-tenant</h2>
      <ul>
        <li>Cada hotel opera en un espacio lógicamente aislado mediante <strong>Row-Level Security (RLS)</strong> a nivel de base de datos.</li>
        <li>Todas las consultas validan el <code>hotel_id</code> del usuario autenticado.</li>
        <li>Los superadministradores solo pueden acceder para soporte con registro auditado.</li>
      </ul>

      <h2>3. Autenticación y control de acceso</h2>
      <ul>
        <li>Contraseñas almacenadas con hash <strong>bcrypt</strong>; nunca en texto plano.</li>
        <li>Sesiones firmadas con JWT y expiración automática.</li>
        <li>Control de accesos basado en roles (RBAC): Administrador, Gerente, Recepción, Housekeeping, Mantenimiento.</li>
        <li>La verificación de roles se realiza mediante una función <code>SECURITY DEFINER</code> del lado del servidor para prevenir escalación de privilegios.</li>
      </ul>

      <h2>4. Protección de datos de pago</h2>
      <p>
        VULO <strong>no almacena datos completos de tarjetas</strong>. Los pagos son procesados
        por proveedores certificados <strong>PCI-DSS Nivel 1</strong> (Stripe / Paddle). VULO solo
        conserva referencias tokenizadas necesarias para reintentos y facturación.
      </p>

      <h2>5. Registros y auditoría</h2>
      <ul>
        <li>Bitácora de acciones críticas (creación, edición y cancelación de reservas, cobros, cambios de rol).</li>
        <li>Logs de acceso conservados por 90 días.</li>
        <li>Alertas automáticas ante comportamiento anómalo (intentos de acceso fallidos, exportaciones masivas).</li>
      </ul>

      <h2>6. Desarrollo seguro</h2>
      <ul>
        <li>Revisión de código y análisis estático antes de cada despliegue.</li>
        <li>Dependencias auditadas periódicamente; parches aplicados con prioridad para CVEs críticos.</li>
        <li>Ambientes separados para desarrollo, pruebas y producción.</li>
      </ul>

      <h2>7. Respaldo y continuidad</h2>
      <ul>
        <li>Respaldos automáticos diarios con retención de 30 días.</li>
        <li>Objetivo de recuperación (RTO) de 4 horas y punto de recuperación (RPO) de 24 horas.</li>
        <li>Pruebas periódicas de restauración.</li>
      </ul>

      <h2>8. Respuesta a incidentes</h2>
      <p>
        En caso de detectar una vulneración de seguridad que afecte datos personales, VULO
        notificará al Cliente afectado sin demora indebida, describiendo la naturaleza del
        incidente, las medidas tomadas y las recomendaciones al titular, en cumplimiento con el
        artículo 20 de la LFPDPPP.
      </p>

      <h2>9. Reporte responsable de vulnerabilidades</h2>
      <p>
        Si detecta una vulnerabilidad en la Plataforma, le pedimos reportarla de forma privada a{" "}
        <a href="mailto:hola@vulo.mx">hola@vulo.mx</a> con el asunto{" "}
        <strong>"Reporte de seguridad"</strong>. Nos comprometemos a acusar recibo dentro de 72
        horas y a mantener comunicación durante el proceso de remediación. Agradecemos la
        divulgación responsable y no iniciaremos acciones legales contra investigadores que actúen
        de buena fe.
      </p>

      <h2>10. Responsabilidad compartida</h2>
      <p>
        La seguridad es una responsabilidad compartida. VULO asegura la plataforma; el Cliente es
        responsable de:
      </p>
      <ul>
        <li>Mantener sus credenciales seguras y usar contraseñas robustas.</li>
        <li>Administrar correctamente los roles y accesos de su equipo.</li>
        <li>Cerrar sesión en dispositivos compartidos.</li>
        <li>Obtener el consentimiento de sus huéspedes para el tratamiento de datos.</li>
      </ul>
    </LegalLayout>
  );
}