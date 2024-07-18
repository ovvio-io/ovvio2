TARGET = ../build/BloomFilter

CXX = emcc
CXXFLAGS = -O3 -std=c++14

SRC = BloomFilter.cpp MurmurHash3.cpp main.cpp
OBJ = $(SRC:.cpp=.o)

all: $(TARGET).js $(TARGET).wasm

$(TARGET).js $(TARGET).wasm: $(OBJ)
	$(CXX) $(CXXFLAGS) -o $(TARGET).js $(OBJ) \
		-s WASM=1 \
		-s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]' \
		-s MODULARIZE=1 \
		-s EXPORT_NAME='createModule' \
		-s ENVIRONMENT='web' \
		--bind

%.o: %.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@

clean:
	rm -f $(OBJ) $(TARGET).js $(TARGET).wasm