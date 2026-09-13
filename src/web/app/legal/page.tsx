import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { STRINGS } from "@/config/strings";

export default function LegalPage() {
  const { legal } = STRINGS;
  return (
    <div className="legal-page">
      <a href="/ledger/" className="legal-back-link">
        <FontAwesomeIcon icon={faArrowLeft} />
        {legal.backToApp}
      </a>

      <h1>{legal.title}</h1>

      <section>
        <h2>{legal.termsHeading}</h2>
        <ul>
          {legal.terms.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>{legal.disclaimerHeading}</h2>
        <ul>
          {legal.disclaimers.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>{legal.contactHeading}</h2>
        <dl>
          <div className="legal-row">
            <dt>{legal.contactLabels.name}</dt>
            <dd>{legal.contactValues.name}</dd>
          </div>
          <div className="legal-row">
            <dt>{legal.contactLabels.address}</dt>
            <dd>{legal.contactValues.address}</dd>
          </div>
          <div className="legal-row">
            <dt>{legal.contactLabels.phone}</dt>
            <dd>{legal.contactValues.phone}</dd>
          </div>
          <div className="legal-row">
            <dt>{legal.contactLabels.email}</dt>
            <dd>
              <a href="mailto:info@rictaworks.jp">info@rictaworks.jp</a>
            </dd>
          </div>
          <div className="legal-row">
            <dt>{legal.contactLabels.web}</dt>
            <dd>
              <a href="https://rictaworks.jp" target="_blank" rel="noopener noreferrer">
                https://rictaworks.jp
              </a>
            </dd>
          </div>
          <div className="legal-row">
            <dt>{legal.contactLabels.x}</dt>
            <dd>
              <a href="https://x.com/rictaworks" target="_blank" rel="noopener noreferrer">
                @rictaworks
              </a>
            </dd>
          </div>
          <div className="legal-row">
            <dt>{legal.contactLabels.github}</dt>
            <dd>
              <a href="https://github.com/rictaworks" target="_blank" rel="noopener noreferrer">
                github.com/rictaworks
              </a>
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
