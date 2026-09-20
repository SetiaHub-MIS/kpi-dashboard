-- Two labels the workbook misspelt and the app has now corrected. Marks key
-- lines by position, not name, so nothing else moves; this only changes
-- what the reports and the XLSX export print.

UPDATE checklist_categories SET name = 'DISIPLIN' WHERE name = 'DISPLIN';
UPDATE checklist_lines SET label = 'DISIPLIN' WHERE label = 'DISPLIN';
UPDATE checklist_categories SET name = 'PENYUSUNAN BARANG' WHERE name = 'PENYUSUAN BARANG';
