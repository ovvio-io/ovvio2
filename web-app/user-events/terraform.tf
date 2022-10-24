variable project {
  type = string
}

variable region {
  type = string
}

variable zone {
  type = string
}

variable "schema_path" {
  type    = string
  default = ""
}

variable "table_id" {
  type    = string
  default = ""
}

terraform {
  backend "gcs" {}

  required_providers {
    google = {
      version = "~> 3.37.0"
    }
  }
}

provider "google" {
  region = var.region
}

resource "google_bigquery_table" "table" {
  dataset_id = "user_events"
  table_id   = var.table_id
  schema     = file(var.schema_path)
  clustering = ["timestamp"]

  labels = {
    user_events = "true"
  }
}

#OUTPUTS
output "table_id" {
  value = google_bigquery_table.table.table_id
}
