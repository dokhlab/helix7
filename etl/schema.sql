CREATE DATABASE IF NOT EXISTS helix7 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE helix7;

CREATE TABLE IF NOT EXISTS receptors (
  id VARCHAR(128) NOT NULL,
  gene VARCHAR(128) NOT NULL,
  name VARCHAR(512) NOT NULL,
  name_html VARCHAR(512) NOT NULL,
  uniprot VARCHAR(64) NOT NULL,
  class_code VARCHAR(32) NOT NULL,
  class_name VARCHAR(255) NOT NULL,
  grafs VARCHAR(64) NOT NULL,
  family VARCHAR(255) NULL,
  family_slug VARCHAR(255) NULL,
  is_olfactory TINYINT(1) NOT NULL DEFAULT 0,
  is_orphan TINYINT(1) NOT NULL DEFAULT 0,
  structure_count INT NOT NULL DEFAULT 0,
  has_experimental_structure TINYINT(1) NOT NULL DEFAULT 0,
  ligand_count INT NULL,
  approved_drug_count INT NULL,
  organ_systems_json LONGTEXT NOT NULL,
  disease_count INT NULL,
  dev_score DECIMAL(8,3) NULL,
  dev_tdl VARCHAR(32) NULL,
  gene_synonyms_text TEXT NOT NULL,
  search_terms_text TEXT NOT NULL,
  search_norm VARCHAR(512) NOT NULL,
  search_condensed VARCHAR(512) NOT NULL,
  payload_json LONGTEXT NOT NULL,
  updated_at VARCHAR(64) NULL,
  PRIMARY KEY (id),
  KEY idx_receptors_gene (gene),
  KEY idx_receptors_class (class_code),
  KEY idx_receptors_grafs (grafs),
  KEY idx_receptors_family (family_slug),
  KEY idx_receptors_olfactory (is_olfactory),
  KEY idx_receptors_score (dev_score),
  KEY idx_receptors_tdl (dev_tdl),
  KEY idx_receptors_structures (structure_count),
  FULLTEXT KEY receptor_search (
    gene, name, gene_synonyms_text, search_terms_text, search_norm, uniprot
  )
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ligands (
  id VARCHAR(128) NOT NULL,
  -- PubChem can provide long systematic names; keep them intact rather than
  -- truncating the source value during the MariaDB load.
  name VARCHAR(2048) NOT NULL,
  is_approved_drug TINYINT(1) NOT NULL DEFAULT 0,
  payload_json LONGTEXT NOT NULL,
  PRIMARY KEY (id),
  KEY idx_ligands_name (name),
  KEY idx_ligands_approved (is_approved_drug)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bioactivities (
  id VARCHAR(128) NOT NULL,
  receptor_id VARCHAR(128) NOT NULL,
  ligand_id VARCHAR(128) NULL,
  action VARCHAR(128) NULL,
  p_value DECIMAL(12,5) NULL,
  reference_pmid VARCHAR(512) NULL,
  payload_json LONGTEXT NOT NULL,
  PRIMARY KEY (id),
  KEY idx_bioactivities_receptor_pvalue (receptor_id, p_value),
  KEY idx_bioactivities_ligand (ligand_id),
  KEY idx_bioactivities_action (action),
  KEY idx_bioactivities_pmid (reference_pmid)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS singleton_json (
  id VARCHAR(32) NOT NULL,
  payload_json LONGTEXT NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS dataset_meta (
  id VARCHAR(32) NOT NULL,
  payload_json LONGTEXT NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB;
