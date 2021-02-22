black ./**.py --fast &&  #| run twice with --fast in order to
black ./**.py --fast &&  #| deal with https://github.com/psf/black/issues/1629
isort ./**.py &&
python regenerate_readme.py
