USV Events Platform - Documentatie automata
==========================================

Aceasta documentatie este generata cu Sphinx pentru cateva module Python 3
reprezentative din backendul aplicatiei.

Module documentate
------------------

.. toctree::
   :maxdepth: 2

   modules/config
   modules/main
   modules/supabase_client
   modules/services
   modules/schema_models
   modules/routers

Proces de generare
------------------

Comenzile recomandate din radacina proiectului sunt:

.. code-block:: powershell

   python -m pip install -r backend\docs\requirements-sphinx.txt
   python -m sphinx -b html backend\docs\sphinx_docs backend\docs\sphinx_build

Rezultatul HTML se deschide din:

.. code-block:: text

   backend/docs/sphinx_build/index.html
