-- =============================================================================
-- Alson Sombreiro Consultadoria: migração inicial
-- =============================================================================

-- Enumerados ------------------------------------------------------------------
CREATE TYPE "RoleName" AS ENUM ('ADMIN', 'GESTOR', 'AGENTE');

CREATE TYPE "FieldType" AS ENUM ('TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'EMAIL', 'PHONE', 'SELECT', 'MULTISELECT', 'CHECKBOX', 'FILE');

CREATE TYPE "Priority" AS ENUM ('BAIXA', 'NORMAL', 'ALTA', 'URGENTE');

CREATE TYPE "HistoryEvent" AS ENUM ('CRIADO', 'ESTADO_ALTERADO', 'RESPONSAVEL_ALTERADO', 'PRIORIDADE_ALTERADA', 'NOTA_ADICIONADA', 'ANEXO_ADICIONADO', 'ANEXO_REMOVIDO', 'DADOS_ALTERADOS');

CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT');

-- Identidade e acessos --------------------------------------------------------
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" "RoleName" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "phone" TEXT,
    "avatar_url" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "role_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "user_agent" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- Catálogo de serviços --------------------------------------------------------
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_description" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "icon" TEXT,
    "cover_image" TEXT,
    "meta_title" TEXT,
    "meta_description" TEXT,
    "og_image" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "form_fields" (
    "id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "FieldType" NOT NULL,
    "placeholder" TEXT,
    "help_text" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER NOT NULL DEFAULT 2,
    "options" JSONB NOT NULL DEFAULT '[]',
    "validation" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_fields_pkey" PRIMARY KEY ("id")
);

-- Pipeline --------------------------------------------------------------------
CREATE TABLE "request_statuses" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748B',
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_initial" BOOLEAN NOT NULL DEFAULT false,
    "is_final" BOOLEAN NOT NULL DEFAULT false,
    "notify_requester" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "request_statuses_pkey" PRIMARY KEY ("id")
);

-- Pedidos ---------------------------------------------------------------------
CREATE TABLE "requests" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "service_id" UUID NOT NULL,
    "status_id" UUID NOT NULL,
    "assignee_id" UUID,
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "requester_name" TEXT NOT NULL,
    "requester_email" TEXT NOT NULL,
    "requester_phone" TEXT,
    "source_ip" TEXT,
    "source_agent" TEXT,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "request_fields" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "field_id" UUID,
    "field_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "FieldType" NOT NULL,
    "value" JSONB,
    "display_value" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_fields_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attachments" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "field_key" TEXT,
    "original_name" TEXT NOT NULL,
    "stored_name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "checksum" TEXT,
    "uploaded_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "request_history" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "event" "HistoryEvent" NOT NULL,
    "description" TEXT NOT NULL,
    "from_value" TEXT,
    "to_value" TEXT,
    "author_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notes" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "author_id" UUID,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- Auditoria e suporte ---------------------------------------------------------
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "changes" JSONB,
    "actor_id" UUID,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reference_counters" (
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reference_counters_pkey" PRIMARY KEY ("year")
);

-- Índices ---------------------------------------------------------------------
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_role_id_idx" ON "users"("role_id");
CREATE INDEX "users_active_deleted_at_idx" ON "users"("active", "deleted_at");

CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX "refresh_tokens_user_id_revoked_at_idx" ON "refresh_tokens"("user_id", "revoked_at");

CREATE UNIQUE INDEX "services_slug_key" ON "services"("slug");
CREATE INDEX "services_active_order_idx" ON "services"("active", "order");
CREATE INDEX "services_featured_idx" ON "services"("featured");

CREATE UNIQUE INDEX "form_fields_service_id_key_key" ON "form_fields"("service_id", "key");
CREATE INDEX "form_fields_service_id_order_idx" ON "form_fields"("service_id", "order");

CREATE UNIQUE INDEX "request_statuses_key_key" ON "request_statuses"("key");
CREATE INDEX "request_statuses_active_order_idx" ON "request_statuses"("active", "order");

CREATE UNIQUE INDEX "requests_reference_key" ON "requests"("reference");
CREATE INDEX "requests_status_id_created_at_idx" ON "requests"("status_id", "created_at");
CREATE INDEX "requests_service_id_idx" ON "requests"("service_id");
CREATE INDEX "requests_assignee_id_idx" ON "requests"("assignee_id");
CREATE INDEX "requests_created_at_idx" ON "requests"("created_at");
CREATE INDEX "requests_requester_email_idx" ON "requests"("requester_email");

CREATE UNIQUE INDEX "request_fields_request_id_field_key_key" ON "request_fields"("request_id", "field_key");
CREATE INDEX "request_fields_request_id_idx" ON "request_fields"("request_id");

CREATE INDEX "attachments_request_id_deleted_at_idx" ON "attachments"("request_id", "deleted_at");

CREATE INDEX "request_history_request_id_created_at_idx" ON "request_history"("request_id", "created_at");

CREATE INDEX "notes_request_id_created_at_idx" ON "notes"("request_id", "created_at");

CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- Chaves estrangeiras ---------------------------------------------------------
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "requests" ADD CONSTRAINT "requests_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "requests" ADD CONSTRAINT "requests_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "request_statuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "requests" ADD CONSTRAINT "requests_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "request_fields" ADD CONSTRAINT "request_fields_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "request_fields" ADD CONSTRAINT "request_fields_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "form_fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "attachments" ADD CONSTRAINT "attachments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "request_history" ADD CONSTRAINT "request_history_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "request_history" ADD CONSTRAINT "request_history_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "notes" ADD CONSTRAINT "notes_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notes" ADD CONSTRAINT "notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
