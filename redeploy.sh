docker build -t canhazdb .
docker stack rm canhazdb
docker rm -f $(docker ps -aq)
sleep 6
docker stack deploy -c docker-compose.yml canhazdb
docker service logs canhazdb_canhazdb -f

