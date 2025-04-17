
PHONY := clean image run

clean:
	docker rmi --force simojenki/hls2flac:latest

image:
	docker build --pull -t simojenki/hls2flac:latest .

run: image
	docker run \
		-it \
		-p 3000:3000 \
		--rm \
		--name hls2flac \
		simojenki/hls2flac