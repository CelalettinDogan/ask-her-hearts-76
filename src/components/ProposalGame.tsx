import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Heart, Camera, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import romanticBackground from '@/assets/romantic-background.jpg';

type GameStage = 'welcome' | 'riddle' | 'compliment' | 'camera' | 'photo-overlay' | 'buildup' | 'proposal' | 'celebration';

interface FloatingHeart {
  id: number;
  left: number;
  delay: number;
}

interface ConfettiPiece {
  id: number;
  left: number;
  color: string;
  delay: number;
}

const ProposalGame = () => {
  const [currentStage, setCurrentStage] = useState<GameStage>('welcome');
  const [capturedPhoto, setCapturedPhoto] = useState<string>('');
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [showMainHeart, setShowMainHeart] = useState(false);
  const [riddleAnswer, setRiddleAnswer] = useState('');
  const [showBuildup, setShowBuildup] = useState(false);
  const [revealedLetters, setRevealedLetters] = useState<number[]>([0, 5]); // S and S are already shown
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Positive response buttons in Turkish
  const positiveButtons = [
    "Evet isterim! ❤️",
    "Evet çok isterim! 💕",
    "Tabii ki evet! 🥰",
    "Elbette sevgilim! 💖",
    "Çok isterim aşkım! 💗"
  ];

  const startCamera = async () => {
    // Stop any existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    const attempts: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      { video: { facingMode: 'user' }, audio: false } as any,
      { video: { facingMode: { ideal: 'environment' } }, audio: false },
      { video: true, audio: false } as any,
    ];

    let lastError: unknown = null;
    for (const constraints of attempts) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (videoRef.current) {
          const v = videoRef.current;
          v.srcObject = stream;
          streamRef.current = stream;
          v.muted = true;
          v.setAttribute('muted', 'true');
          v.setAttribute('playsinline', 'true');
          (v as any).playsInline = true;
          try { v.load?.(); } catch {}
          try { await v.play(); } catch {}
        }
        setCurrentStage('camera');
        toast({ title: 'Kamera hazır', description: 'Görüntü gelmiyorsa yeniden başlatmayı deneyin.' });
        return;
      } catch (err) {
        lastError = err;
        continue;
      }
    }

    console.error('Camera access error:', lastError);
    toast({
      title: 'Kamera erişimi başarısız',
      description: 'İzinleri kontrol edin veya Yedek: Fotoğraf Yükle seçeneğini kullanın.',
      variant: 'destructive',
    });
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0);
        
        const photoData = canvas.toDataURL('image/png');
        setCapturedPhoto(photoData);
        
        // Stop camera stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        
        setCurrentStage('photo-overlay');
        
        // Auto-advance to buildup after 4 seconds
        setTimeout(() => {
          setCurrentStage('buildup');
        }, 4000);
      }
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCapturedPhoto(dataUrl);
      setCurrentStage('photo-overlay');
      setTimeout(() => setCurrentStage('buildup'), 4000);
    };
    reader.readAsDataURL(file);
  };

  const handlePositiveResponse = () => {
    createFloatingHearts();
    createConfetti();
    setShowMainHeart(true);
    setCurrentStage('celebration');
    
    toast({
      title: "🎉 Yaşasın!",
      description: "Seni çok seviyorum Yağmur! ❤️",
    });
  };

  const handleNegativeResponse = () => {
    toast({
      title: "Hayırr! 😅",
      description: "Yanlış butona tıkladınız, yeniden deneyin.",
      variant: "destructive"
    });
    
    // Restart the game
    setTimeout(() => {
      setCurrentStage('welcome');
      setCapturedPhoto('');
      setFloatingHearts([]);
      setConfetti([]);
      setShowMainHeart(false);
    }, 2000);
  };

  const createFloatingHearts = () => {
    const hearts: FloatingHeart[] = [];
    for (let i = 0; i < 20; i++) {
      hearts.push({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2
      });
    }
    setFloatingHearts(hearts);
  };

  const createConfetti = () => {
    const pieces: ConfettiPiece[] = [];
    const colors = ['#ff69b4', '#ffc0cb', '#ffb6c1', '#ff1493', '#dda0dd'];
    
    for (let i = 0; i < 50; i++) {
      pieces.push({
        id: i,
        left: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 2
      });
    }
    setConfetti(pieces);
  };

  // Letter reveal functionality
  const targetPhrase = "SENI SEVIYORUM";
  const revealLetter = () => {
    const hiddenIndexes = [];
    for (let i = 0; i < targetPhrase.length; i++) {
      if (!revealedLetters.includes(i) && targetPhrase[i] !== ' ') {
        hiddenIndexes.push(i);
      }
    }
    
    if (hiddenIndexes.length > 0) {
      const randomIndex = hiddenIndexes[Math.floor(Math.random() * hiddenIndexes.length)];
      setRevealedLetters(prev => [...prev, randomIndex]);
      
      // Check if word is complete
      const newRevealed = [...revealedLetters, randomIndex];
      const allLettersRevealed = targetPhrase.split('').every((char, index) => 
        char === ' ' || newRevealed.includes(index)
      );
      
      if (allLettersRevealed) {
        setTimeout(() => {
          toast({
            title: "Tamamlandı! 😍",
            description: "Seni Seviyorum!",
          });
          setTimeout(() => setCurrentStage("compliment"), 1500);
        }, 500);
      }
    }
  };

  const displayPhrase = () => {
    return targetPhrase.split('').map((char, index) => {
      if (char === ' ') return ' ';
      return revealedLetters.includes(index) ? char : '_';
    }).join('');
  };

  const handleGuess = () => {
    if (riddleAnswer.toLowerCase().replace(/\s+/g, '').includes("seniseviyorum") || 
        riddleAnswer.toLowerCase().includes("seni seviyorum")) {
      toast({
        title: "Doğru tahmin! 😍",
        description: "Biliyordum ki beni seviyorsun!",
      });
      setTimeout(() => setCurrentStage("compliment"), 1500);
    } else {
      toast({
        title: "Tekrar dene! 💭",
        description: "Harf alarak ipucu edinebilirsin...",
        variant: "destructive"
      });
    }
  };

  const handleRiddleSubmit = () => {
    if (riddleAnswer.toLowerCase().includes("seni seviyorum") || riddleAnswer.toLowerCase().includes("seviyorum")) {
      toast({
        title: "Biliyordum! 😍",
        description: "Sen de beni seviyorsun!",
      });
      setTimeout(() => setCurrentStage("compliment"), 1500);
    } else {
      toast({
        title: "Tekrar dene! 💭",
        description: "İpucu: Bana hep söylediğin üç kelime...",
        variant: "destructive"
      });
    }
  };

  const proceedToBuildup = () => {
    setShowBuildup(true);
    setTimeout(() => {
      setCurrentStage('proposal');
    }, 5000);
  };

  const restartGame = () => {
    setCurrentStage('welcome');
    setCapturedPhoto('');
    setFloatingHearts([]);
    setConfetti([]);
    setShowMainHeart(false);
    setRiddleAnswer('');
    setShowBuildup(false);
    setRevealedLetters([0, 5]); // Reset to initial S___ S_v_____m.
  };

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{
        backgroundImage: `url(${romanticBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Floating Hearts Animation */}
      {floatingHearts.map((heart) => (
        <div
          key={heart.id}
          className="absolute text-heart text-4xl animate-fly-heart pointer-events-none z-10"
          style={{
            left: `${heart.left}%`,
            animationDelay: `${heart.delay}s`
          }}
        >
          ❤️
        </div>
      ))}

      {/* Confetti Animation */}
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className="absolute w-3 h-3 animate-confetti-fall pointer-events-none z-10"
          style={{
            left: `${piece.left}%`,
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`
          }}
        />
      ))}

      {/* Main Heart Celebration */}
      {showMainHeart && (
        <div className="fixed inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="text-9xl animate-pulse-heart">
            💖
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-screen p-2 sm:p-4">
        <Card className="max-w-md w-full mx-2 p-4 sm:p-8 romantic-shadow bg-card/95 backdrop-blur-sm">
          
          {/* Welcome Stage */}
          {currentStage === 'welcome' && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <Sparkles className="w-12 sm:w-16 h-12 sm:h-16 text-accent animate-float-heart" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-primary">
                Merhaba Yağmur
              </h1>
              <Button 
                variant="default"
                size="lg"
                onClick={() => setCurrentStage('riddle')}
                className="w-full romantic-gradient glow-effect"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Oyuna Başla
              </Button>
            </div>
          )}

          {/* Riddle Stage */}
          {currentStage === 'riddle' && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <Heart className="w-12 sm:w-16 h-12 sm:h-16 text-heart animate-pulse-heart" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-primary">
                Kalbimde iki küçük kelime yazsın 💕
              </h2>
              <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                <div className="text-2xl sm:text-3xl font-mono font-bold text-primary tracking-wider">
                  {displayPhrase()}
                </div>
                <p className="text-sm text-muted-foreground">
                  Harfleri açarak kelimeyi tamamla!
                </p>
              </div>
              <Button 
                variant="default"
                size="lg"
                onClick={revealLetter}
                className="w-full heart-gradient glow-effect"
                disabled={targetPhrase.split('').every((char, index) => 
                  char === ' ' || revealedLetters.includes(index)
                )}
              >
                <Heart className="mr-2 h-5 w-5" />
                Harf Al
              </Button>
              
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Ya da kelimeyi tahmin et:
                </p>
                <Input
                  type="text"
                  value={riddleAnswer}
                  onChange={(e) => setRiddleAnswer(e.target.value)}
                  placeholder="Tahminini yaz..."
                  className="w-full p-3 text-base border-2 border-primary/30 focus:border-primary"
                />
                <Button 
                  variant="secondary"
                  size="lg"
                  onClick={handleGuess}
                  className="w-full"
                  disabled={!riddleAnswer.trim()}
                >
                  <Heart className="mr-2 h-5 w-5" />
                  Tahmin Et
                </Button>
              </div>
            </div>
          )}

          {/* Compliment Stage */}
          {currentStage === 'compliment' && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <Sparkles className="w-12 sm:w-16 h-12 sm:h-16 text-accent animate-float-heart" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-primary">
                Aferin sana! 🌟
              </h2>
              <div className="space-y-4">
                <p className="text-base sm:text-lg text-foreground font-medium">
                  Sen gerçekten çok zekisin! 🧠✨
                </p>
                <p className="text-muted-foreground">
                  Şimdi seni daha yakından görmek istiyorum...
                </p>
              </div>
              <Button 
                variant="default"
                size="lg"
                onClick={startCamera}
                className="w-full romantic-gradient glow-effect"
              >
                <Camera className="mr-2 h-5 w-5" />
                Devam Et
              </Button>
            </div>
          )}

          {/* Camera Stage */}
          {currentStage === 'camera' && (
            <div className="text-center space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-primary">
                Güzel bir fotoğraf çekelim! 📸
              </h2>
              <div className="relative rounded-lg overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 sm:h-80 object-cover transform scale-x-[-1]"
                  style={{ 
                    maxHeight: '320px',
                    minHeight: '240px'
                  }}
                />
                <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                  📱 Kendinizi görebilirsiniz
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Kameranızı görebiliyor musunuz? Eğer görünmüyorsa kamera izinlerini kontrol edin.
              </p>
              <div className="space-y-2">
                <Button 
                  variant="default"
                  size="lg"
                  onClick={capturePhoto}
                  className="w-full heart-gradient glow-effect"
                >
                  <Heart className="mr-2 h-5 w-5" />
                  Fotoğraf Çek
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full hover-scale"
                >
                  Yedek: Fotoğraf Yükle
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={onFileChange}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startCamera}
                  className="w-full"
                >
                  Kamerayı Yeniden Başlat
                </Button>
              </div>
            </div>
          )}

          {/* Photo Overlay Stage */}
          {currentStage === 'photo-overlay' && (
            <div className="text-center space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-primary animate-pulse-heart">
                Çokk güzelsin! 😍
              </h2>
              <div className="relative rounded-lg overflow-hidden">
                <img 
                  src={capturedPhoto} 
                  alt="Captured" 
                  className="w-full h-64 sm:h-80 object-cover transform scale-x-[-1]"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <p className="text-white text-xl sm:text-2xl font-bold glow-effect text-center px-4">
                    Çokk güzelsin ✨
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Buildup Stage */}
          {currentStage === 'buildup' && (
            <div className="text-center space-y-6">
              <div className="animate-pulse-heart">
                <Heart className="w-16 h-16 text-heart mx-auto mb-4" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-primary">
                Yağmur... 💕
              </h2>
              <div className="space-y-4">
                <p className="text-base sm:text-lg text-foreground font-medium">
                  Seni ne kadar çok sevdiğimi biliyor musun?
                </p>
                {showBuildup && (
                  <div className="animate-fade-in space-y-3">
                    <p className="text-primary font-medium">
                      Ve şimdi sana özel bir sorum var... ❤️
                    </p>
                  </div>
                )}
              </div>
              <Button 
                variant="default"
                size="lg"
                onClick={proceedToBuildup}
                className="w-full heart-gradient glow-effect"
              >
                <Heart className="mr-2 h-5 w-5" />
                Devam Et
              </Button>
            </div>
          )}

          {/* Proposal Stage */}
          {currentStage === 'proposal' && (
            <div className="text-center space-y-6">
              <div className="animate-pulse-heart">
                <Heart className="w-16 h-16 text-heart mx-auto mb-4" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-primary">
                Yağmur,
              </h2>
              <p className="text-base sm:text-lg text-foreground font-medium px-2">
                Seni çok seviyorum, benimle çıkar mısın? ❤️
              </p>
              
              <div className="space-y-3">
                {positiveButtons.map((text, index) => (
                  <Button
                    key={index}
                    variant="default"
                    size="lg"
                    onClick={handlePositiveResponse}
                    className="w-full romantic-gradient glow-effect text-sm sm:text-base"
                  >
                    {text}
                  </Button>
                ))}
                
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleNegativeResponse}
                  className="w-full border-muted-foreground text-muted-foreground hover:bg-muted text-sm sm:text-base"
                >
                  Hayır
                </Button>
              </div>
            </div>
          )}

          {/* Celebration Stage */}
          {currentStage === 'celebration' && (
            <div className="text-center space-y-6">
              <div className="animate-pulse-heart">
                <Heart className="w-16 sm:w-20 h-16 sm:h-20 text-heart mx-auto" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-primary">
                🎉 Yaşasın! 🎉
              </h2>
              <div className="space-y-3">
                <p className="text-lg sm:text-xl text-foreground font-medium">
                  Seni çok seviyorum Yağmur! ❤️
                </p>
                <p className="text-base sm:text-lg text-muted-foreground">
                  En mutlu günümüz! 💕
                </p>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Artık resmi olarak çiftiz! 🥰
                </p>
              </div>
              
              <Button
                variant="default"
                size="lg"
                onClick={restartGame}
                className="gold-gradient"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Tekrar Oyna
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default ProposalGame;