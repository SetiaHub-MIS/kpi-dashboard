UPDATE checklist_categories
   SET name = 'KEKEMASAN STOR'
 WHERE form_key = 'sv' AND position = 4 AND name = 'KEKEMASAN KEDAI';

UPDATE checklist_lines l
   SET label = 'KEKEMASAN STOR'
  FROM checklist_categories c
 WHERE l.category_id = c.id
   AND c.form_key = 'sv' AND c.position = 4
   AND l.label = 'KEKEMASAN KEDAI';