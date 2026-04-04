import fs from "fs";
import path from "path";
import Handlebars from "handlebars";
import { NotificationKind, NotificationType } from "@prisma/client";

const compiled = new Map<string, Handlebars.TemplateDelegate>();

function templatesRoot(): string {
  return path.join(process.cwd(), "templates", "notifications");
}

function readAndCompile(
  kind: NotificationKind,
  relativePath: string,
): Handlebars.TemplateDelegate {
  const key = `${kind}/${relativePath}`;
  const cached = compiled.get(key);
  if (cached) {
    return cached;
  }

  const fullPath = path.join(templatesRoot(), kind, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing template file: ${fullPath}`);
  }

  const source = fs.readFileSync(fullPath, "utf8");
  const tpl = Handlebars.compile(source, { strict: false });
  compiled.set(key, tpl);
  return tpl;
}

export interface RenderedEmailParts {
  subject: string;
  text: string;
  html: string;
}

export interface RenderedWebsiteParts {
  title: string;
  body: string;
}

export class NotificationTemplateEngine {
  renderEmailTemplates(
    kind: NotificationKind,
    data: Record<string, string>,
  ): RenderedEmailParts {
    return {
      subject: readAndCompile(kind, "email.subject.hbs")(data),
      text: readAndCompile(kind, "email.text.hbs")(data),
      html: readAndCompile(kind, "email.html.hbs")(data),
    };
  }

  renderWebsiteTemplates(
    kind: NotificationKind,
    data: Record<string, string>,
  ): RenderedWebsiteParts {
    return {
      title: readAndCompile(kind, "website.title.hbs")(data),
      body: readAndCompile(kind, "website.body.hbs")(data),
    };
  }

  renderForDelivery(
    kind: NotificationKind,
    type: NotificationType,
    data: Record<string, string>,
  ): {
    title: string;
    body: string;
    htmlBody?: string;
    emailSubject?: string;
  } {
    if (type === NotificationType.EMAIL) {
      const e = this.renderEmailTemplates(kind, data);
      return {
        title: e.subject,
        body: e.text,
        htmlBody: e.html,
        emailSubject: e.subject,
      };
    }

    const w = this.renderWebsiteTemplates(kind, data);
    return {
      title: w.title,
      body: w.body,
    };
  }
}

export const notificationTemplateEngine = new NotificationTemplateEngine();
