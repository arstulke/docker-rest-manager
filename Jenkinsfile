def imageName
def app

pipeline {
  agent any

  stages {
    stage('Prepare Build') {
      steps {
          withCredentials([[$class: 'UsernamePasswordMultiBinding', credentialsId: 'docker-hub-credentials', usernameVariable: 'USERNAME', passwordVariable: 'PASSWORD']]) {
            script {
              imageName = "$USERNAME/docker-rest-manager";
            }
          }
      }
    }

    stage('Build') {
      steps {
        script {
          app = docker.build(imageName);
        }
      }
    }
    stage('Prepare push to DockerHub') {
      agent {
        docker 'node'
      }
      when {
        expression { env.BRANCH_NAME == 'master' }
      }
      steps {
        sh 'git rev-parse --short HEAD > git_hash.tag.txt'
        sh 'node -p "require(\'./package.json\').version" > npm_package_version.tag.txt'

        stash name: "docker_tags", includes: "*.tag.txt"
      }
    }
    stage('Push to DockerHub') {
      when {
        expression { env.BRANCH_NAME == 'master' }
      }
      steps {
        unstash "docker_tags"

        script {
          docker.withRegistry('https://registry.hub.docker.com', 'docker-hub-credentials') {
            def git_hash = readFile('git_hash.tag.txt');
            def npm_package_version = readFile('npm_package_version.tag.txt');

            app.push(git_hash);
            app.push(npm_package_version);
            app.push('latest');
          }
        }
      }
    }
  }
}
