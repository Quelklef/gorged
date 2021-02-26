import socket


class FifoClient:
    def __init__(self, path):
        self.path = path
        self.socket = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)

    def open(self):
        self.socket.connect(self.path)

    def close(self):
        self.socket.close()

    def __enter__(self):
        self.open()
        return self

    def __exit__(self, type, value, traceback):
        self.close()

    def send(self, message_str):
        if not isinstance(message_str, str):
            raise ValueError("Can only send a str object")

        message = message_str.encode("utf-8")

        header = bytes(str(len(message)), "ascii") + b":"
        while header:
            header = header[self.socket.send(header) :]

        while message:
            message = message[self.socket.send(message) :]

    def recv(self):
        initial = b""
        while b":" not in initial:
            initial += self.socket.recv(16)

        size = int(initial[: initial.index(b":")])
        message = initial[initial.index(b":") + 1 :]

        while len(message) < size:
            message += self.socket.recv(4096)

        return message.decode("utf-8")

    def call(self, message):
        self.send(message)
        return self.recv()
