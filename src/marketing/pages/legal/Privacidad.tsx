import LegalLayout from "./LegalLayout";
import { LEGAL } from "@/marketing/lib/legal";

export default function Privacidad() {
  return (
    <LegalLayout
      title="Aviso de Privacidad Integral"
      description="Emitido conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares publicada en el DOF el 20 de marzo de 2025."
      updated={LEGAL.actualizado}
    >
      <p>
        En cumplimiento de los artículos 3, 15 y 16 de la{" "}
        <strong>Ley Federal de Protección de Datos Personales en Posesión de los Particulares</strong>{" "}
        (en adelante, la "Ley" o "LFPDPPP"), publicada en el Diario Oficial de la Federación el{" "}
        <strong>20 de marzo de 2025</strong>, se pone a disposición de las personas titulares el
        presente Aviso de Privacidad Integral.
      </p>

      <h2>1. Identidad y domicilio del Responsable</h2>
      <p>
        <strong>{LEGAL.titular}</strong>, persona física con actividad empresarial, con Registro
        Federal de Contribuyentes <strong>{LEGAL.rfc}</strong>, quien opera comercialmente la
        plataforma <strong>VULO</strong> (en adelante, el "Responsable" o "VULO"), con domicilio
        para oír y recibir notificaciones en:
      </p>
      <p>
        <strong>{LEGAL.domicilio}</strong>
      </p>
      <p>
        Correo electrónico de contacto y buzón de datos personales:{" "}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> · WhatsApp:{" "}
        <a href={LEGAL.whatsapp} target="_blank" rel="noreferrer">{LEGAL.telefono}</a> · Horario de
        atención: {LEGAL.horario}.
      </p>

      <h2>2. Datos personales que se someten a tratamiento</h2>
      <p>
        Conforme al artículo 15, fracción II de la Ley, se identifican las categorías de datos que
        se recaban directamente de la persona titular al registrarse, contratar o utilizar la
        plataforma:
      </p>
      <ul>
        <li>
          <strong>Datos de identificación:</strong> nombre y apellidos, firma cuando se requiera
          en documentos de registro de huéspedes.
        </li>
        <li>
          <strong>Datos de contacto:</strong> correo electrónico, número telefónico y número de
          WhatsApp.
        </li>
        <li>
          <strong>Datos fiscales:</strong> nombre o razón social, RFC, régimen fiscal, código
          postal y domicilio fiscal, exclusivamente para la emisión del comprobante fiscal digital
          (CFDI).
        </li>
        <li>
          <strong>Datos de la cuenta y del establecimiento:</strong> nombre comercial del hotel,
          logotipo, número de habitaciones, moneda y configuración operativa.
        </li>
        <li>
          <strong>Datos técnicos y de uso:</strong> dirección IP, tipo de navegador y dispositivo,
          registros de acceso y bitácora de acciones realizadas dentro del sistema.
        </li>
      </ul>
      <p>
        <strong>Datos personales sensibles:</strong> VULO no solicita ni requiere datos personales
        sensibles en los términos del artículo 3, fracción X de la Ley. No se recaban datos
        biométricos, de salud, origen étnico, creencias religiosas, opiniones políticas ni
        preferencia sexual.
      </p>
      <p>
        <strong>Datos financieros y de pago:</strong> el pago de la suscripción se realiza por
        transferencia electrónica o depósito bancario. VULO <strong>no recaba, no procesa y no
        almacena números de tarjetas bancarias</strong> ni credenciales de banca en línea.
      </p>

      <h2>3. Datos de huéspedes: el Cliente actúa como Responsable</h2>
      <p>
        Cuando un hotel utiliza la plataforma para registrar información de sus huéspedes, dicho
        hotel es el <strong>Responsable</strong> de esos datos personales y VULO actúa únicamente
        como <strong>Encargado</strong>, tratándolos por cuenta y bajo instrucciones del hotel,
        conforme a los artículos 3, 12 y 20 de la Ley. En consecuencia, corresponde al hotel:
      </p>
      <ul>
        <li>Poner su propio aviso de privacidad a disposición de sus huéspedes.</li>
        <li>Recabar el consentimiento que en su caso resulte necesario.</li>
        <li>Atender y resolver las solicitudes de derechos ARCO de sus huéspedes.</li>
      </ul>
      <p>
        VULO no utiliza los datos de huéspedes para finalidades propias, no los comercializa y no
        los transfiere a terceros distintos de los proveedores de infraestructura necesarios para
        prestar el servicio.
      </p>

      <h2>4. Finalidades del tratamiento</h2>
      <h3>4.1 Finalidades primarias (necesarias para la relación jurídica)</h3>
      <ul>
        <li>Crear, verificar y administrar la cuenta de la persona usuaria y de su hotel.</li>
        <li>
          Prestar los servicios contratados: gestión de reservas, recepción, habitaciones,
          inventarios, punto de venta, reportes y mensajería por WhatsApp.
        </li>
        <li>Cobrar la suscripción y emitir el CFDI correspondiente.</li>
        <li>Brindar soporte técnico y atención a solicitudes.</li>
        <li>
          Enviar comunicaciones operativas indispensables: confirmación de cuenta, recuperación de
          contraseña, avisos de seguridad y cambios en el servicio.
        </li>
        <li>
          Cumplir obligaciones legales, fiscales y contables aplicables, así como requerimientos
          fundados y motivados de autoridad competente.
        </li>
        <li>Prevenir fraude, abuso y usos no autorizados de la plataforma.</li>
      </ul>
      <h3>4.2 Finalidades secundarias (no necesarias)</h3>
      <ul>
        <li>Enviar información comercial sobre nuevas funciones, planes y promociones de VULO.</li>
        <li>Realizar encuestas de satisfacción.</li>
        <li>Elaborar estadísticas agregadas y anónimas para mejorar el producto.</li>
      </ul>
      <p>
        Si usted no desea que sus datos se traten para las finalidades secundarias, puede
        manifestarlo desde este momento enviando un correo a{" "}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> con el asunto{" "}
        <strong>"Negativa finalidades secundarias"</strong>. Su negativa no será motivo para
        negarle el servicio contratado.
      </p>

      <h2>5. Medios para limitar el uso o divulgación de sus datos</h2>
      <p>
        Además del correo señalado en el punto anterior, usted puede inscribir su número
        telefónico en el <strong>Registro Público para Evitar Publicidad (REPEP)</strong> de la
        Procuraduría Federal del Consumidor, y desactivar las comunicaciones comerciales desde el
        enlace incluido al pie de cada correo de esa naturaleza.
      </p>

      <h2>6. Derechos ARCO y medios para ejercerlos</h2>
      <p>
        Conforme a los artículos 22 a 27 de la Ley, usted tiene derecho a{" "}
        <strong>Acceder</strong> a sus datos personales, solicitar su{" "}
        <strong>Rectificación</strong> cuando sean inexactos o incompletos, su{" "}
        <strong>Cancelación</strong> cuando considere que no se requieren para las finalidades
        informadas, así como a <strong>Oponerse</strong> a su tratamiento por causa legítima.
      </p>
      <p>
        La persona designada para dar trámite a estas solicitudes, en términos del artículo 29 de
        la Ley, es el propio Responsable, a través del buzón{" "}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> o en el domicilio señalado en el punto
        1. Conforme al artículo 28, la solicitud deberá contener y acompañar:
      </p>
      <ol>
        <li>Nombre de la persona titular y domicilio o medio para recibir la respuesta.</li>
        <li>
          Documentos que acrediten su identidad o, en su caso, la representación legal
          (identificación oficial vigente).
        </li>
        <li>Descripción clara y precisa de los datos respecto de los que ejerce el derecho.</li>
        <li>Cualquier elemento que facilite la localización de los datos personales.</li>
        <li>
          En solicitudes de rectificación, las modificaciones a realizarse y la documentación que
          las sustente (artículo 30).
        </li>
      </ol>
      <p>
        El Responsable comunicará la determinación adoptada en un plazo máximo de{" "}
        <strong>veinte días</strong> contados desde la recepción de la solicitud, y la hará
        efectiva dentro de los quince días siguientes, conforme al artículo 31 de la Ley. El
        ejercicio de los derechos ARCO es <strong>gratuito</strong>; únicamente podrán cobrarse los
        costos justificados de reproducción, copias o envío (artículo 34).
      </p>
      <p>
        El Responsable podrá negar el ejercicio de los derechos en los supuestos del artículo 33 de
        la Ley, informando la causa de manera fundada y motivada.
      </p>

      <h2>7. Revocación del consentimiento</h2>
      <p>
        Usted puede revocar en cualquier momento el consentimiento otorgado para el tratamiento de
        sus datos, mediante el mismo procedimiento previsto para los derechos ARCO. La revocación
        podrá implicar la imposibilidad de continuar prestando el servicio y, en su caso, la
        terminación de la relación contractual, sin perjuicio de la conservación de datos que
        resulte obligatoria por disposición legal.
      </p>

      <h2>8. Transferencias y remisiones de datos personales</h2>
      <p>
        VULO <strong>no vende ni comercializa</strong> datos personales. Para operar la plataforma
        se apoya en proveedores que actúan como <strong>Encargados</strong>, es decir, tratan los
        datos por cuenta del Responsable bajo obligaciones de confidencialidad y seguridad; estas
        remisiones no requieren consentimiento en términos de la Ley:
      </p>
      <ul>
        <li>
          <strong>Infraestructura y base de datos en la nube:</strong> hospedaje del sistema,
          autenticación y almacenamiento de archivos.
        </li>
        <li>
          <strong>Envío de correo electrónico transaccional:</strong> confirmaciones, recuperación
          de contraseña y avisos del sistema.
        </li>
        <li>
          <strong>Mensajería por WhatsApp:</strong> envío de confirmaciones y mensajes operativos
          que el hotel decide enviar a sus huéspedes.
        </li>
        <li>
          <strong>Servicios de inteligencia artificial:</strong> procesamiento de los mensajes que
          el hotel decide atender con el asistente automatizado.
        </li>
      </ul>
      <p>
        Algunos de estos proveedores pueden encontrarse fuera del territorio nacional. En todos los
        casos se exige contractualmente un nivel de protección equivalente al previsto por la Ley.
      </p>
      <p>
        Adicionalmente, sus datos podrán transferirse sin requerir su consentimiento cuando la
        transferencia esté prevista en una ley o tratado, sea necesaria para el cumplimiento de un
        contrato celebrado con usted, o sea requerida por autoridad competente, conforme al
        artículo 36 de la Ley.
      </p>

      <h2>9. Medidas de seguridad</h2>
      <p>
        En cumplimiento del artículo 18 de la Ley, el Responsable mantiene medidas de seguridad
        administrativas, técnicas y físicas para proteger los datos personales contra daño,
        pérdida, alteración, destrucción, uso, acceso o tratamiento no autorizado. Las principales
        medidas se detallan en nuestra{" "}
        <a href="/legal/seguridad">Política de Seguridad</a>.
      </p>
      <p>
        En caso de una vulneración de seguridad que afecte de forma significativa los derechos
        patrimoniales o morales de las personas titulares, será informada de forma inmediata para
        que puedan tomar las medidas correspondientes, conforme al artículo 19 de la Ley.
      </p>

      <h2>10. Plazo de conservación</h2>
      <p>
        Los datos se conservan durante la vigencia de la relación contractual. Concluida esta, se
        conservan bloqueados únicamente por los plazos que exige la normativa fiscal y mercantil
        aplicable —cinco años conforme al Código Fiscal de la Federación y al Código de Comercio—
        tras lo cual se suprimen.
      </p>

      <h2>11. Cookies y tecnologías similares</h2>
      <p>
        El sitio y la plataforma utilizan almacenamiento local y cookies estrictamente necesarias
        para mantener la sesión iniciada, el hotel activo y las preferencias de visualización. No
        se utilizan cookies de publicidad de terceros. Usted puede configurar su navegador para
        rechazarlas, considerando que algunas funciones del sistema podrían dejar de operar.
      </p>

      <h2>12. Cambios al presente Aviso de Privacidad</h2>
      <p>
        Cualquier modificación a este Aviso será publicada en{" "}
        <a href="https://vulo.mx/legal/privacidad">vulo.mx/legal/privacidad</a>, indicando la fecha
        de última actualización, y se notificará por correo electrónico a las personas usuarias
        registradas cuando el cambio sea sustancial.
      </p>

      <h2>13. Autoridad competente</h2>
      <p>
        Si considera que su derecho a la protección de datos personales ha sido vulnerado, o que
        existe un incumplimiento a la Ley, puede presentar su inconformidad ante la{" "}
        <strong>Secretaría Anticorrupción y Buen Gobierno</strong>, autoridad a la que la Ley
        publicada el 20 de marzo de 2025 confiere la vigilancia del cumplimiento de esta materia
        (artículos 38 y 39).
      </p>

      <h2>14. Aceptación</h2>
      <p>
        El registro en la plataforma, la contratación del servicio o el uso continuado del sistema
        implican que usted ha leído y acepta los términos del presente Aviso de Privacidad, en
        términos del artículo 8 de la Ley.
      </p>
      <p>
        <strong>Última actualización:</strong> {LEGAL.actualizado}.
      </p>
    </LegalLayout>
  );
}
