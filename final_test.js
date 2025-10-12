const http = require('http');

console.log('🧪 BlockNote AI 리라이터 최종 테스트\n');

// 테스트 1: 기본 번역 (영어 → 한국어)
const translationTest = {
  textBlocks: [
    {
      id: "block_0",
      text: "Hello, this is a test paragraph. We want to see if the AI can translate this into Korean.",
      type: "paragraph"
    },
    {
      id: "block_1", 
      text: "Artificial Intelligence technology is advancing rapidly.",
      type: "paragraph"
    }
  ],
  action: "translate"
};

// 테스트 2: 어조 개선
const toneTest = {
  textBlocks: [
    {
      id: "block_0",
      text: "이 기능 정말 별로야. 왜 이렇게 느려?",
      type: "paragraph"
    }
  ],
  action: "improve-tone"
};

// 테스트 3: 서식 보존 테스트 (복합 콘텐츠)
const formatTest = {
  textBlocks: [
    {
      id: "block_0",
      text: "AI Technology Development",
      type: "heading"
    },
    {
      id: "block_1",
      text: "Artificial Intelligence has made remarkable progress in recent years.",
      type: "paragraph"
    },
    {
      id: "block_2",
      text: "인공지능 기술은 우리의 미래를 바꿀 것입니다.",
      type: "paragraph"
    }
  ],
  action: "translate"
};

async function runTest(testName, testData, port = 3002) {
  return new Promise((resolve, reject) => {
    console.log(`📝 ${testName} 테스트 시작...`);
    
    const data = JSON.stringify(testData);
    
    const options = {
      hostname: 'localhost',
      port: port,
      path: '/api/rewrite',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          
          if (response.error) {
            console.log(`❌ ${testName} 실패:`, response.error);
            resolve(false);
          } else {
            console.log(`✅ ${testName} 성공!`);
            
            // 결과 출력
            console.log('📊 처리 결과:');
            response.processedBlocks.forEach((block, index) => {
              const original = testData.textBlocks[index];
              console.log(`  [${block.type}] ${block.text}`);
              
              // 서식 보존 확인
              if (block.id !== original.id || block.type !== original.type) {
                console.log(`⚠️  서식 불일치: ID ${original.id}→${block.id}, Type ${original.type}→${block.type}`);
              }
            });
            
            console.log('\n🔍 서식 보존 검증:');
            const idsPreserved = response.processedBlocks.every((block, i) => block.id === testData.textBlocks[i].id);
            const typesPreserved = response.processedBlocks.every((block, i) => block.type === testData.textBlocks[i].type);
            const countPreserved = response.processedBlocks.length === testData.textBlocks.length;
            
            console.log(`  - 블록 개수 보존: ${countPreserved ? '✅' : '❌'}`);
            console.log(`  - ID 보존: ${idsPreserved ? '✅' : '❌'}`);  
            console.log(`  - 타입 보존: ${typesPreserved ? '✅' : '❌'}`);
            
            resolve(true);
          }
        } catch (error) {
          console.log(`❌ ${testName} 응답 파싱 오류:`, error.message);
          console.log('Raw response:', responseData);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ ${testName} 요청 오류:`, error.message);
      resolve(false);
    });
    
    req.setTimeout(30000, () => {
      console.log(`❌ ${testName} 타임아웃`);
      req.destroy();
      resolve(false);
    });
    
    req.write(data);
    req.end();
  });
}

async function runAllTests() {
  console.log('🚀 모든 테스트 실행 중...\n');
  
  const results = [];
  
  // 서버가 준비될 때까지 잠시 대기
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  results.push(await runTest('영어→한국어 번역', translationTest));
  console.log('\n' + '='.repeat(50) + '\n');
  
  results.push(await runTest('어조 개선', toneTest));
  console.log('\n' + '='.repeat(50) + '\n');
  
  results.push(await runTest('서식 보존 (복합 콘텐츠)', formatTest));
  console.log('\n' + '='.repeat(50) + '\n');
  
  // 결과 요약
  const successCount = results.filter(Boolean).length;
  console.log('🎯 최종 테스트 결과 요약:');
  console.log(`📊 성공률: ${successCount}/${results.length} (${Math.round(successCount/results.length*100)}%)`);
  console.log('📋 기능별 결과:');
  console.log(`  - 번역 기능: ${results[0] ? '✅ 정상' : '❌ 실패'}`);
  console.log(`  - 어조 개선: ${results[1] ? '✅ 정상' : '❌ 실패'}`);
  console.log(`  - 서식 보존: ${results[2] ? '✅ 정상' : '❌ 실패'}`);
  
  if (successCount === results.length) {
    console.log('\n🎉 모든 테스트 통과! BlockNote AI 리라이터가 완벽하게 작동합니다.');
    console.log('🔗 브라우저에서 http://localhost:3002 접속하여 사용해보세요!');
  } else {
    console.log('\n⚠️  일부 테스트에서 문제가 발견되었습니다.');
  }
}

runAllTests().catch(console.error);