# Documentatie automata backend

Acest folder contine configuratia si rezultatele pentru documentarea automata a
codului Python 3 din backend.

## Sphinx

Comenzi recomandate din radacina proiectului:

```powershell
python -m pip install -r backend\docs\requirements-sphinx.txt
python -m sphinx -b html backend\docs\sphinx_docs backend\docs\sphinx_build
```

Rezultatul HTML se deschide din:

```text
backend/docs/sphinx_build/index.html
```
