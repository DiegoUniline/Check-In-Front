import LegalLayout from "./LegalLayout";
import { LEGAL } from "@/marketing/lib/legal";

export default function Terminos() {
  return (
    <LegalLayout
      title="Términos y Condiciones de Uso"
      description="Condiciones aplicables a la contratación y uso de la plataforma VULO, conforme a la legislación mexicana."
      updated={LEGAL.actualizado}
    >
      <p>
        Los presentes Términos y Condiciones (los "Términos") regulan el acceso y uso de la
        plataforma <strong>VULO</strong> (el "Servicio"), operada por{" "}
        <strong>{LEGAL.titular}</strong>, persona física con actividad empresarial, RFC{" "}
        <strong>{LEGAL.rfc}</strong>, con domicilio en <strong>{LEGAL.domicilio}</strong>{" "}
        ("VULO" o el "Proveedor"). Al registrarse, contratar o utilizar el Servicio, usted (el
        "Cliente") manifiesta haber leído y aceptado estos Términos.
      </p>

      <h2>1. Definiciones</h2>
      <ul>
        <li>
          <strong>Servicio o Plataforma:</strong> el software como servicio (SaaS) VULO para
          gestión hotelera, disponible en {LEGAL.sitio} y sus subdominios.
        </li>
        <li>
          <strong>Cliente:</strong> la persona física o moral titular de la cuenta del hotel.
        </li>
        <li>
          <strong>Usuario:</strong> las personas autorizadas por el Cliente para acceder al
          Servicio (recepción, gerencia, limpieza, mantenimiento u otros roles).
        </li>
        <li>
          <strong>Contenido del Cliente:</strong> la información que el Cliente carga o genera en
          la Plataforma, incluyendo datos de huéspedes, reservas, tarifas e inventarios.
        </li>
        <li>
          <strong>Suscripción:</strong> el plan contratado conforme a los precios publicados.
        </li>
      </ul>

      <h2>2. Objeto y licencia de uso</h2>
      <p>
        VULO otorga al Cliente una licencia limitada, temporal, revocable, no exclusiva y no
        transferible para utilizar la Plataforma durante la vigencia de su Suscripción, únicamente
        para la gestión de su propia operación hotelera. El Servicio se presta bajo la modalidad de
        software como servicio; no se entrega copia del programa ni se transmite su propiedad.
      </p>

      <h2>3. Registro, cuenta y credenciales</h2>
      <ul>
        <li>El Cliente debe ser mayor de edad y contar con capacidad legal para contratar.</li>
        <li>La información de registro debe ser veraz, exacta y mantenerse actualizada.</li>
        <li>
          El Cliente es responsable de la confidencialidad de sus credenciales, de los accesos que
          otorgue a sus Usuarios y de toda actividad realizada desde su cuenta.
        </li>
        <li>
          El Cliente debe notificar de inmediato cualquier uso no autorizado al correo{" "}
          <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
        </li>
      </ul>

      <h2>4. Precios, forma de pago y facturación</h2>
      <h3>4.1 Precios</h3>
      <p>
        Los precios vigentes se publican en{" "}
        <a href="https://vulo.mx/precios">vulo.mx/precios</a>, se expresan en{" "}
        <strong>Pesos Mexicanos (MXN)</strong> y se adiciona el Impuesto al Valor Agregado cuando
        resulte aplicable. Los importes mostrados en otras monedas son únicamente referenciales,
        calculados con un tipo de cambio informativo, y no constituyen el precio de cobro.
      </p>
      <h3>4.2 Forma de pago</h3>
      <p>
        La Suscripción se paga por <strong>transferencia electrónica o depósito bancario</strong> a
        la cuenta que VULO indique, de forma <strong>mensual anticipada</strong>, salvo pacto
        distinto por escrito. VULO no cobra mediante domiciliación de tarjeta y{" "}
        <strong>no recaba ni almacena datos de tarjetas bancarias</strong>.
      </p>
      <h3>4.3 Comprobante fiscal</h3>
      <p>
        VULO emite el <strong>Comprobante Fiscal Digital por Internet (CFDI)</strong> correspondiente
        a cada pago, con base en la constancia de situación fiscal y los datos que el Cliente
        proporcione. Es responsabilidad del Cliente entregar y mantener actualizados sus datos
        fiscales; los CFDI solicitados fuera del ejercicio fiscal en que se realizó el pago quedan
        sujetos a las reglas del Servicio de Administración Tributaria.
      </p>
      <h3>4.4 Falta de pago</h3>
      <p>
        En caso de falta de pago superior a <strong>10 días naturales</strong> a partir de la fecha
        de vencimiento, VULO podrá suspender el acceso al Servicio previo aviso al Cliente. La
        información se conserva durante <strong>30 días naturales</strong> adicionales para permitir
        su regularización o exportación.
      </p>
      <h3>4.5 Cambios de precio</h3>
      <p>
        VULO podrá modificar sus precios notificando al Cliente con al menos{" "}
        <strong>30 días naturales</strong> de anticipación. Los ajustes no aplican a periodos ya
        pagados.
      </p>

      <h2>5. Vigencia, renovación y cancelación</h2>
      <p>
        La Suscripción se contrata por periodos mensuales que se renuevan al recibir el pago
        correspondiente. El Cliente puede cancelar en cualquier momento notificándolo a{" "}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> o por WhatsApp al{" "}
        <a href={LEGAL.whatsapp} target="_blank" rel="noreferrer">{LEGAL.telefono}</a>. La
        cancelación surte efectos al término del periodo ya pagado y no genera reembolsos por
        periodos parciales, salvo los supuestos previstos por la{" "}
        <strong>Ley Federal de Protección al Consumidor</strong>.
      </p>

      <h2>6. Información previa y derecho de revocación</h2>
      <p>
        En términos de los artículos 76 bis y 56 de la Ley Federal de Protección al Consumidor,
        cuando el Cliente contrate como consumidor por medios electrónicos, la información esencial
        del Servicio (características, precio, forma de pago y datos del proveedor) se encuentra
        disponible en este sitio antes de contratar, y el Cliente cuenta con{" "}
        <strong>cinco días hábiles</strong> posteriores a la contratación para revocar su
        consentimiento sin responsabilidad, siempre que no haya hecho uso efectivo del Servicio. La
        solicitud debe enviarse a <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>

      <h2>7. Obligaciones del Cliente</h2>
      <ul>
        <li>Utilizar el Servicio conforme a la legislación mexicana aplicable.</li>
        <li>
          No realizar ingeniería inversa, descompilación, desensamblado ni intentar obtener el
          código fuente de la Plataforma.
        </li>
        <li>No revender, sublicenciar, arrendar ni ceder la cuenta sin autorización por escrito.</li>
        <li>
          Cumplir sus obligaciones como Responsable frente a sus huéspedes en materia de datos
          personales, incluyendo poner a disposición su propio aviso de privacidad.
        </li>
        <li>
          No utilizar el Servicio ni los canales de mensajería para enviar comunicaciones no
          solicitadas, fraudulentas, engañosas o contrarias a las políticas de la plataforma de
          mensajería utilizada.
        </li>
        <li>No intentar vulnerar, sobrecargar o acceder sin autorización a la infraestructura.</li>
      </ul>

      <h2>8. Propiedad intelectual</h2>
      <p>
        La Plataforma, su código, diseño, interfaces, marcas, logotipos, documentación y materiales
        son propiedad de <strong>{LEGAL.titular}</strong> y/o de sus licenciantes, y se encuentran
        protegidos por la <strong>Ley Federal del Derecho de Autor</strong> y la{" "}
        <strong>Ley Federal de Protección a la Propiedad Industrial</strong>. Estos Términos no
        transmiten al Cliente ningún derecho de propiedad.
      </p>
      <p>
        El <strong>Contenido del Cliente</strong> es y permanece de su propiedad. El Cliente otorga
        a VULO una licencia limitada para almacenarlo, procesarlo, respaldarlo y mostrarlo con el
        único fin de prestar el Servicio contratado.
      </p>

      <h2>9. Disponibilidad y soporte</h2>
      <p>
        VULO realiza sus mejores esfuerzos para mantener el Servicio disponible de forma continua.
        El soporte se presta en horario de <strong>{LEGAL.horario}</strong>, por WhatsApp al{" "}
        <a href={LEGAL.whatsapp} target="_blank" rel="noreferrer">{LEGAL.telefono}</a> y por correo
        a <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. Las solicitudes recibidas fuera de
        ese horario se atienden el siguiente día hábil.
      </p>
      <p>
        Los mantenimientos programados que impliquen interrupción se notifican con anticipación. El
        Servicio puede depender de proveedores externos de infraestructura, mensajería y conectividad,
        cuyas interrupciones no son imputables a VULO.
      </p>

      <h2>10. Protección de datos personales</h2>
      <p>
        El tratamiento de datos personales se rige por el{" "}
        <a href="/legal/privacidad">Aviso de Privacidad</a>, conforme a la Ley Federal de Protección
        de Datos Personales en Posesión de los Particulares publicada en el DOF el 20 de marzo de
        2025. Respecto de los datos de huéspedes, el Cliente es{" "}
        <strong>Responsable</strong> y VULO actúa como <strong>Encargado</strong>, tratándolos
        únicamente por cuenta e instrucción del Cliente.
      </p>

      <h2>11. Limitación de responsabilidad</h2>
      <p>
        En la medida permitida por la ley, VULO no será responsable por daños indirectos o
        consecuenciales, incluyendo lucro cesante o pérdida de oportunidad comercial. La
        responsabilidad total del Proveedor frente al Cliente por cualquier concepto se limita al{" "}
        <strong>monto efectivamente pagado por el Cliente durante los tres meses inmediatos
        anteriores</strong> al hecho que origine la reclamación.
      </p>
      <p>
        Esta limitación no aplica a los daños causados por dolo o mala fe, ni a las
        responsabilidades que conforme a la ley no pueden limitarse.
      </p>

      <h2>12. Indemnización</h2>
      <p>
        El Cliente se obliga a mantener en paz y a salvo al Proveedor frente a reclamaciones de
        terceros derivadas de: (i) el uso indebido del Servicio, (ii) el incumplimiento de estos
        Términos, (iii) el Contenido del Cliente y el tratamiento que realice de los datos de sus
        huéspedes, o (iv) el incumplimiento de la normativa aplicable a su operación hotelera.
      </p>

      <h2>13. Suspensión y terminación</h2>
      <p>
        VULO podrá suspender o terminar el Servicio cuando se presente: (i) falta de pago, (ii) uso
        contrario a la ley o a estos Términos, (iii) requerimiento de autoridad competente, o (iv)
        un riesgo de seguridad para la Plataforma o para otros clientes.
      </p>
      <p>
        Concluida la relación, el Cliente podrá exportar su información dentro de los{" "}
        <strong>30 días naturales</strong> siguientes. Transcurrido ese plazo, la información podrá
        suprimirse definitivamente, salvo aquella cuya conservación sea obligatoria por ley.
      </p>

      <h2>14. Modificaciones a los Términos</h2>
      <p>
        VULO podrá modificar estos Términos publicando la versión vigente en{" "}
        <a href="https://vulo.mx/legal/terminos">vulo.mx/legal/terminos</a>. Los cambios
        sustanciales se notificarán con al menos <strong>15 días naturales</strong> de anticipación.
        El uso continuado del Servicio implica la aceptación de la versión vigente.
      </p>

      <h2>15. Caso fortuito y fuerza mayor</h2>
      <p>
        Ninguna de las partes será responsable por el incumplimiento derivado de caso fortuito o
        fuerza mayor, incluyendo desastres naturales, interrupciones de energía o
        telecomunicaciones, ataques informáticos de gran escala o disposiciones de autoridad.
      </p>

      <h2>16. Legislación aplicable y jurisdicción</h2>
      <p>
        Estos Términos se rigen por las leyes de los <strong>Estados Unidos Mexicanos</strong>. Para
        su interpretación y cumplimiento, las partes se someten a la competencia de los tribunales
        de <strong>{LEGAL.ciudad}</strong>, renunciando a cualquier otro fuero que pudiera
        corresponderles por razón de sus domicilios presentes o futuros.
      </p>
      <p>
        Cuando el Cliente tenga la calidad de consumidor, podrá acudir a la{" "}
        <strong>Procuraduría Federal del Consumidor (PROFECO)</strong> en términos de la Ley Federal
        de Protección al Consumidor.
      </p>

      <h2>17. Datos del Proveedor</h2>
      <p>
        <strong>{LEGAL.titular}</strong> · RFC {LEGAL.rfc} · {LEGAL.domicilio} ·{" "}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> · WhatsApp{" "}
        <a href={LEGAL.whatsapp} target="_blank" rel="noreferrer">{LEGAL.telefono}</a> ·{" "}
        {LEGAL.horario}.
      </p>
      <p>
        <strong>Última actualización:</strong> {LEGAL.actualizado}.
      </p>
    </LegalLayout>
  );
}
