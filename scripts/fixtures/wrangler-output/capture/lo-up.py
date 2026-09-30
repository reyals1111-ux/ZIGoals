import socket, fcntl, struct
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
fcntl.ioctl(s, 0x8914, struct.pack('16sH14s', b'lo', 0x1 | 0x8 | 0x40, b'\0' * 14))  # SIOCSIFFLAGS: UP|LOOPBACK|RUNNING
