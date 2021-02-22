black ./**.py --fast &&  #| run twice with --fast in order to
black ./**.py --fast &&  #| deal with https://github.com/psf/black/issues/1629
isort ./**.py &&
flake8 ./**.py --max-line-length=140 --ignore=W503,E722,F811 &&  # F811 due to github.com/PyCQA/pyflakes/issues/488
python regenerate_readme.py
