CREATE DATABASE IF NOT EXISTS banco_estoque
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE banco_estoque;

CREATE TABLE IF NOT EXISTS itens (
    id INT NOT NULL AUTO_INCREMENT,
    descricao VARCHAR(255) NOT NULL,
    categoria VARCHAR(120) NOT NULL,
    quantidade INT NOT NULL DEFAULT 0,
    preco DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    localizacao VARCHAR(150) NOT NULL,
    PRIMARY KEY (id)
);

DELIMITER //
DROP PROCEDURE IF EXISTS adicionar_colunas_estoque//
CREATE PROCEDURE adicionar_colunas_estoque()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'itens'
          AND COLUMN_NAME = 'categoria'
    ) THEN
        ALTER TABLE itens
            ADD COLUMN categoria VARCHAR(120) NOT NULL DEFAULT '' AFTER descricao;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'itens'
          AND COLUMN_NAME = 'localizacao'
    ) THEN
        ALTER TABLE itens
            ADD COLUMN localizacao VARCHAR(150) NOT NULL DEFAULT '' AFTER preco;
    END IF;
END//
DELIMITER ;

CALL adicionar_colunas_estoque();
DROP PROCEDURE adicionar_colunas_estoque;

-- Registros fictícios de demonstração autorizados para este script.
INSERT IGNORE INTO itens (id, descricao, categoria, quantidade, preco, localizacao)
VALUES
    (1, 'Parafuso sextavado', 'Fixadores', 120, 0.50, 'Prateleira A1'),
    (2, 'Chave de fenda', 'Ferramentas', 18, 12.90, 'Prateleira B2'),
    (3, 'Fita isolante', 'Materiais elétricos', 35, 6.75, 'Prateleira C1');